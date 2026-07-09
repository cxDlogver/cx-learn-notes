import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { Annotation, Command, END, MemorySaver, START, StateGraph, interrupt } from "@langchain/langgraph";
import { validateVideoProject } from "@miaoma-magicut/video-project";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path, { dirname, extname } from "node:path";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
//#region src/audio/probe-audio-duration.ts
const execFileAsync$2 = promisify(execFile);
const probeAudioDuration = async ({ execFile = execFileAsync$2, ffprobePath, filePath }) => {
	const { stdout } = await execFile(ffprobePath, [
		"-v",
		"error",
		"-print_format",
		"json",
		"-show_format",
		filePath
	]);
	const output = JSON.parse(stdout);
	const seconds = Number(output.format?.duration);
	if (!Number.isFinite(seconds)) throw new Error(`Audio duration is missing in ${filePath}`);
	return Math.round(seconds * 1e3);
};
//#endregion
//#region src/config/load-agent-env.ts
const AgentEnvSchema = z.object({
	LLM_MODEL: z.string().min(1),
	TTS_MODEL: z.string().min(1),
	BASE_URL: z.string().url(),
	API_KEY: z.string().min(1)
});
var AgentEnvValidationError = class extends Error {
	issues;
	constructor(issues) {
		super("Invalid video agent environment configuration");
		this.name = "AgentEnvValidationError";
		this.issues = issues;
	}
};
const loadAgentEnv = ({ envFilePath, processEnv = process.env } = {}) => {
	const dotenvValues = envFilePath && existsSync(envFilePath) ? parse(readFileSync(envFilePath)) : {};
	const parsed = AgentEnvSchema.safeParse({
		...dotenvValues,
		...processEnv
	});
	if (!parsed.success) throw new AgentEnvValidationError(parsed.error.issues.map((issue) => ({
		field: String(issue.path[0] ?? "root"),
		message: issue.message
	})));
	return parsed.data;
};
//#endregion
//#region src/events/event-emitter.ts
const redactSecrets = (value) => value.replace(/ark-[A-Za-z0-9_-]+/g, "[REDACTED]");
const serializeError = (error) => {
	if (error instanceof Error) return redactSecrets(error.message);
	if (typeof error === "string") return redactSecrets(error);
	return redactSecrets(JSON.stringify(error));
};
const createSequencedEventEmitter = ({ emit, runId }) => {
	let sequence = 0;
	return { emit: (event) => {
		sequence += 1;
		emit?.({
			...event,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			runId,
			sequence
		});
	} };
};
//#endregion
//#region src/graph/checkpoint.ts
const createVideoCreationCheckpointer = () => new MemorySaver();
//#endregion
//#region src/graph/nodes.ts
const requireInput = (state) => {
	if (!state.input) throw new Error("Video creation input is required");
	return state.input;
};
const requireBrief = (state) => {
	if (!state.brief) throw new Error("Creative brief is required");
	return state.brief;
};
const requireProject = (state) => {
	if (!state.project) throw new Error("Video project is required");
	return state.project;
};
const createInstrumentedNode = ({ emit, nodeName, run }) => async (state) => {
	emit({
		createdAt: "",
		nodeName,
		runId: state.runId,
		sequence: 0,
		type: "node.started"
	});
	try {
		const update = await run(state);
		emit({
			createdAt: "",
			nodeName,
			runId: state.runId,
			sequence: 0,
			type: "node.completed"
		});
		return update;
	} catch (error) {
		emit({
			createdAt: "",
			error: serializeError(error),
			nodeName,
			runId: state.runId,
			sequence: 0,
			type: "node.failed"
		});
		throw error;
	}
};
const emitModelStreamReport = async ({ context, emit, messageId, nodeName, prompt, title, tools, runId }) => {
	if (!tools.streamReport) return;
	emit({
		createdAt: "",
		messageId,
		nodeName,
		runId,
		sequence: 0,
		title,
		type: "model.stream.started"
	});
	await tools.streamReport({
		context,
		prompt,
		title
	}, (delta) => {
		emit({
			createdAt: "",
			delta,
			messageId,
			nodeName,
			runId,
			sequence: 0,
			type: "model.stream.delta"
		});
	});
	emit({
		createdAt: "",
		messageId,
		nodeName,
		runId,
		sequence: 0,
		type: "model.stream.completed"
	});
};
const createVideoCreationNodes = ({ emit, tools }) => ({
	analyzeAssets: createInstrumentedNode({
		emit,
		nodeName: "asset_understand",
		run: async (state) => ({ assets: await tools.analyzeAssets({
			assets: state.assets,
			input: requireInput(state)
		}) })
	}),
	assembleTimeline: createInstrumentedNode({
		emit,
		nodeName: "timeline_assemble",
		run: async (state) => {
			const brief = requireBrief(state);
			const input = requireInput(state);
			await emitModelStreamReport({
				context: `创作标题：${brief.title}\n分镜数量：${state.scenes.length}\n配音片段：${state.voices.length}`,
				emit,
				messageId: "timeline_assemble-finalization",
				nodeName: "timeline_assemble",
				prompt: input.prompt,
				runId: state.runId,
				title: "视频生成与工程整理",
				tools
			});
			return { project: await tools.assembleTimeline({
				assets: state.assets,
				brief,
				input,
				matches: state.matches,
				scenes: state.scenes,
				voices: state.voices
			}) };
		}
	}),
	creativeBrief: createInstrumentedNode({
		emit,
		nodeName: "creative_brief",
		run: async (state) => {
			const input = requireInput(state);
			await emitModelStreamReport({
				context: `素材数量：${state.assets.length}`,
				emit,
				messageId: "creative_brief-content-understanding",
				nodeName: "creative_brief",
				prompt: input.prompt,
				runId: state.runId,
				title: "内容理解",
				tools
			});
			return { brief: await tools.generateCreativeBrief({
				assets: state.assets,
				input
			}) };
		}
	}),
	matchAssets: createInstrumentedNode({
		emit,
		nodeName: "asset_matcher",
		run: async (state) => {
			const input = requireInput(state);
			await emitModelStreamReport({
				context: `分镜数量：${state.scenes.length}\n候选素材数量：${state.assets.length}`,
				emit,
				messageId: "asset_matcher-voice-strategy",
				nodeName: "asset_matcher",
				prompt: input.prompt,
				runId: state.runId,
				title: "素材匹配与配音生成",
				tools
			});
			return { matches: await tools.matchAssets({
				assets: state.assets,
				input,
				scenes: state.scenes
			}) };
		}
	}),
	planScenes: createInstrumentedNode({
		emit,
		nodeName: "scene_planner",
		run: async (state) => {
			const brief = requireBrief(state);
			const input = requireInput(state);
			await emitModelStreamReport({
				context: `创作标题：${brief.title}\n核心信息：${brief.keyMessages.join("、")}`,
				emit,
				messageId: "scene_planner-storyboard-breakdown",
				nodeName: "scene_planner",
				prompt: input.prompt,
				runId: state.runId,
				title: "文稿拆解为可执行分镜",
				tools
			});
			return { scenes: await tools.planScenes({
				assets: state.assets,
				brief,
				input
			}) };
		}
	}),
	saveProject: createInstrumentedNode({
		emit,
		nodeName: "project_save",
		run: async (state) => ({ savedProjectPath: (await tools.saveProject({ project: requireProject(state) })).path })
	}),
	scanAssets: createInstrumentedNode({
		emit,
		nodeName: "asset_scan",
		run: async (state) => ({ assets: await tools.scanAssets({ input: requireInput(state) }) })
	}),
	sceneApproval: async (state) => {
		emit({
			createdAt: "",
			nodeName: "scene_approval",
			runId: state.runId,
			sequence: 0,
			type: "node.started"
		});
		const approval = interrupt({
			payload: {
				brief: state.brief,
				scenes: state.scenes
			},
			type: "scene-plan"
		});
		try {
			if (!approval.approved) throw new Error("Scene plan approval was rejected");
			emit({
				createdAt: "",
				nodeName: "scene_approval",
				runId: state.runId,
				sequence: 0,
				type: "node.completed"
			});
			return {};
		} catch (error) {
			emit({
				createdAt: "",
				error: serializeError(error),
				nodeName: "scene_approval",
				runId: state.runId,
				sequence: 0,
				type: "node.failed"
			});
			throw error;
		}
	},
	synthesizeVoice: createInstrumentedNode({
		emit,
		nodeName: "tts",
		run: async (state) => {
			const brief = requireBrief(state);
			const input = requireInput(state);
			await emitModelStreamReport({
				context: `口播音色：${input.selectedVoiceType ?? "默认音色"}\n分镜数量：${state.scenes.length}`,
				emit,
				messageId: "tts-voice-generation",
				nodeName: "tts",
				prompt: input.prompt,
				runId: state.runId,
				title: "口播配音生成",
				tools
			});
			return { voices: await tools.synthesizeVoice({
				brief,
				input,
				scenes: state.scenes
			}) };
		}
	}),
	validateProject: createInstrumentedNode({
		emit,
		nodeName: "validation",
		run: async (state) => {
			const project = requireProject(state);
			const localValidation = validateVideoProject(project);
			if (localValidation.success === false) throw new Error(localValidation.issues.join("; "));
			const toolValidation = await tools.validateProject({ project });
			if (toolValidation.success === false) throw new Error(toolValidation.error);
			return {};
		}
	})
});
//#endregion
//#region src/graph/state.ts
const VideoCreationStateAnnotation = Annotation.Root({
	assets: Annotation,
	brief: Annotation,
	errors: Annotation,
	input: Annotation,
	matches: Annotation,
	project: Annotation,
	runId: Annotation,
	savedProjectPath: Annotation,
	scenes: Annotation,
	voices: Annotation
});
//#endregion
//#region src/graph/create-video-creation-graph.ts
const isInterruptResult = (value) => Boolean(value && typeof value === "object" && "__interrupt__" in value && Array.isArray(value.__interrupt__));
const getStateValues = async ({ app, runId }) => {
	return (await app.getState({ configurable: { thread_id: runId } })).values;
};
const createCompiledGraph = ({ checkpointer, emit, tools }) => {
	const nodes = createVideoCreationNodes({
		emit,
		tools
	});
	return new StateGraph(VideoCreationStateAnnotation).addNode("scan_assets", nodes.scanAssets).addNode("analyze_assets", nodes.analyzeAssets).addNode("creative_brief", nodes.creativeBrief).addNode("plan_scenes", nodes.planScenes).addNode("scene_approval", nodes.sceneApproval).addNode("match_assets", nodes.matchAssets).addNode("synthesize_voice", nodes.synthesizeVoice).addNode("assemble_timeline", nodes.assembleTimeline).addNode("validate_project", nodes.validateProject).addNode("save_project", nodes.saveProject).addEdge(START, "scan_assets").addEdge("scan_assets", "analyze_assets").addEdge("analyze_assets", "creative_brief").addEdge("creative_brief", "plan_scenes").addEdge("plan_scenes", "scene_approval").addEdge("scene_approval", "match_assets").addEdge("match_assets", "synthesize_voice").addEdge("synthesize_voice", "assemble_timeline").addEdge("assemble_timeline", "validate_project").addEdge("validate_project", "save_project").addEdge("save_project", END).compile({ checkpointer });
};
const createVideoCreationGraph = ({ checkpointer = createVideoCreationCheckpointer(), emit, tools }) => {
	const eventEmitters = /* @__PURE__ */ new Map();
	const getEmitter = (runId) => {
		const existing = eventEmitters.get(runId);
		if (existing) return existing;
		const created = createSequencedEventEmitter({
			emit,
			runId
		});
		eventEmitters.set(runId, created);
		return created;
	};
	const app = createCompiledGraph({
		checkpointer,
		emit: (event) => {
			getEmitter(event.runId).emit(event);
		},
		tools
	});
	const toResult = async ({ output, runId }) => {
		const state = await getStateValues({
			app,
			runId
		});
		if (isInterruptResult(output)) {
			const approval = output.__interrupt__[0]?.value;
			if (approval) getEmitter(runId).emit({
				approval,
				type: "approval.required"
			});
			return {
				approval,
				errors: [],
				runId,
				state,
				status: "waiting_for_approval"
			};
		}
		const project = state.project;
		const savedProjectPath = state.savedProjectPath;
		if (!project) return {
			errors: ["Video project was not generated"],
			runId,
			state,
			status: "failed"
		};
		getEmitter(runId).emit({
			projectId: project.project.id,
			savedProjectPath,
			type: "run.completed"
		});
		return {
			errors: [],
			project,
			runId,
			savedProjectPath,
			state,
			status: "completed"
		};
	};
	const failRun = async ({ error, runId }) => {
		const message = serializeError(error);
		let state;
		try {
			state = await getStateValues({
				app,
				runId
			});
		} catch {
			state = void 0;
		}
		getEmitter(runId).emit({
			error: message,
			type: "run.failed"
		});
		return {
			errors: [message],
			runId,
			state,
			status: "failed"
		};
	};
	return {
		resume: async ({ approval, runId }) => {
			try {
				return toResult({
					output: await app.invoke(new Command({ resume: approval }), { configurable: { thread_id: runId } }),
					runId
				});
			} catch (error) {
				return failRun({
					error,
					runId
				});
			}
		},
		start: async (input) => {
			getEmitter(input.runId).emit({
				input: {
					prompt: input.prompt,
					sourceAssetDirectory: input.sourceAssetDirectory
				},
				type: "run.started"
			});
			try {
				return toResult({
					output: await app.invoke({
						input,
						runId: input.runId
					}, { configurable: { thread_id: input.runId } }),
					runId: input.runId
				});
			} catch (error) {
				return failRun({
					error,
					runId: input.runId
				});
			}
		}
	};
};
//#endregion
//#region src/media/extract-keyframes.ts
const execFileAsync$1 = promisify(execFile);
const extractKeyframes = async ({ ffmpegPath, filePath, frameCount, outputDirectory }) => {
	if (frameCount < 1) throw new Error("frameCount must be greater than 0");
	await mkdir(outputDirectory, { recursive: true });
	await execFileAsync$1(ffmpegPath, [
		"-hide_banner",
		"-loglevel",
		"error",
		"-i",
		filePath,
		"-frames:v",
		String(frameCount),
		"-q:v",
		"2",
		"-y",
		path.join(outputDirectory, "keyframe-%03d.jpg")
	]);
	return (await readdir(outputDirectory)).filter((fileName) => fileName.startsWith("keyframe-")).sort().map((fileName, index) => ({
		index: index + 1,
		path: path.join(outputDirectory, fileName),
		timestampMs: 0
	}));
};
//#endregion
//#region src/media/probe-media.ts
const execFileAsync = promisify(execFile);
const parseSecondsToMs = (value) => {
	const seconds = Number(value);
	if (!Number.isFinite(seconds)) return 0;
	return Math.round(seconds * 1e3);
};
const parseFrameRate = (value) => {
	if (!value) return 0;
	const [rawNumerator, rawDenominator] = value.split("/");
	const numerator = Number(rawNumerator);
	const denominator = Number(rawDenominator ?? 1);
	if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0;
	return Math.round(numerator / denominator * 1e3) / 1e3;
};
const probeMedia = async ({ ffprobePath, filePath }) => {
	const { stdout } = await execFileAsync(ffprobePath, [
		"-v",
		"error",
		"-print_format",
		"json",
		"-show_format",
		"-show_streams",
		filePath
	]);
	const metadata = JSON.parse(stdout);
	const videoStream = metadata.streams?.find((stream) => stream.codec_type === "video");
	if (!videoStream) throw new Error(`No video stream found in ${filePath}`);
	return {
		codecName: videoStream.codec_name ?? "",
		durationMs: parseSecondsToMs(videoStream.duration) || parseSecondsToMs(metadata.format?.duration),
		filePath,
		fps: parseFrameRate(videoStream.r_frame_rate),
		height: videoStream.height ?? 0,
		width: videoStream.width ?? 0
	};
};
//#endregion
//#region src/prompts/asset-matcher.ts
const AssetMatchCandidateSchema = z.object({
	assetId: z.string().min(1),
	description: z.string().min(1),
	durationMs: z.number().int().positive()
});
const RankedAssetSchema = z.object({
	assetId: z.string().min(1),
	reason: z.string().min(1),
	score: z.number().min(0).max(1)
});
const AssetMatchSchema = z.object({
	rankedAssetIds: z.array(RankedAssetSchema).min(1),
	sceneId: z.string().min(1)
});
const AssetMatchResponseSchema = z.object({ matches: z.array(AssetMatchSchema).min(1) });
const buildAssetMatcherPrompt = ({ candidates, scenes }) => [
	"你是妙剪的视频素材匹配智能体。",
	"只允许从候选 assetId 中选择，输出严格 JSON，不要包含 Markdown。",
	"JSON 字段：matches，每项包含 sceneId 和 rankedAssetIds；rankedAssetIds 每项包含 assetId, score, reason。",
	`分镜：${JSON.stringify(scenes)}`,
	`候选素材：${JSON.stringify(candidates)}`
].join("\n");
//#endregion
//#region src/prompts/creative-brief.ts
const CreativeBriefSchema = z.object({
	audience: z.string().min(1),
	keyMessages: z.array(z.string().min(1)).min(1),
	summary: z.string().min(1),
	title: z.string().min(1),
	tone: z.string().min(1),
	visualStyle: z.string().min(1)
});
const buildCreativeBriefPrompt = ({ prompt, sourceAssetSummaries }) => [
	"你是妙剪的视频创意策划智能体。",
	"根据用户提示词和本地素材摘要，输出严格 JSON，不要包含 Markdown。",
	"JSON 字段：title, summary, audience, tone, visualStyle, keyMessages。",
	`用户提示词：${prompt}`,
	`本地素材摘要：${sourceAssetSummaries.join("；") || "暂无"}`
].join("\n");
//#endregion
//#region src/prompts/frame-description.ts
const FrameDescriptionInputSchema = z.object({
	frameId: z.string().min(1),
	imagePath: z.string().min(1)
});
const FrameDescriptionSchema = z.object({
	actions: z.array(z.string().min(1)),
	description: z.string().min(1),
	frameId: z.string().min(1),
	mood: z.string().min(1),
	objects: z.array(z.string().min(1))
});
const FrameDescriptionResponseSchema = z.object({ frames: z.array(FrameDescriptionSchema) });
const buildFrameDescriptionPrompt = ({ frames }) => [
	"你是妙剪的视频关键帧理解智能体。",
	"根据关键帧路径摘要输出严格 JSON，不要包含 Markdown。",
	"JSON 字段：frames，每项包含 frameId, description, objects, actions, mood。",
	`关键帧：${JSON.stringify(frames)}`
].join("\n");
//#endregion
//#region src/prompts/scene-planner.ts
const PlannedSceneSchema = z.object({
	durationMs: z.number().int().positive(),
	goal: z.string().min(1),
	id: z.string().min(1),
	index: z.number().int().positive(),
	script: z.string().min(1),
	subtitleLines: z.array(z.string().min(1)).min(1),
	title: z.string().min(1),
	visualIntent: z.string().min(1)
});
const ScenePlanResponseSchema = z.object({ scenes: z.array(PlannedSceneSchema).min(1) });
const buildScenePlannerPrompt = ({ brief, targetSceneCount }) => [
	"你是妙剪的视频分镜规划智能体。",
	"根据创意 brief 输出严格 JSON，不要包含 Markdown。",
	"JSON 字段：scenes，每个分镜包含 id, index, title, goal, script, subtitleLines, visualIntent, durationMs。",
	"分镜数量不要固定，要根据内容密度、节奏和可匹配素材自然决定；宁可少而清晰，不要为了凑数量拆碎信息。",
	targetSceneCount ? `参考分镜数量：${targetSceneCount}，这只是弱参考，不是硬性数量。` : "没有固定目标分镜数量，请自行判断需要多少个分镜。",
	"subtitleLines 必须是可以直接朗读给 TTS 的口播稿，每一项都是自然说给观众听的一句话或短句。",
	"每个分镜通常保留 1 到 3 条 subtitleLines，不要把太多句子塞进同一个分镜。",
	"subtitleLines 必须按自然句号、问号、感叹号、分号或语义停顿断开，不要按固定字数截断句子。",
	"不要写分镜说明、镜头动作、标题、编号、冒号式结构，也不要输出“开场：”“镜头1：”“画面：”这类规划标签。",
	"script 必须等于 subtitleLines 按换行拼接，确保左侧文稿字幕展示、字幕文本和 TTS 输入完全一致。",
	"每个分镜对应一个视频画面，但可以包含多条 subtitleLines；每条 subtitleLines 后续会生成一段独立配音。",
	`创意 brief：${JSON.stringify(brief)}`
].join("\n");
//#endregion
//#region src/providers/ark-chat-model-provider.ts
var ModelProviderSchemaError = class extends Error {
	issues;
	task;
	constructor({ issues, task }) {
		super(`Model output failed schema validation for ${task}`);
		this.name = "ModelProviderSchemaError";
		this.issues = issues;
		this.task = task;
	}
};
const createDefaultChatModel = (options) => new ChatOpenAI(options);
const TextEmbeddingResponseSchema = z.object({ embeddings: z.array(z.object({
	embedding: z.array(z.number()),
	text: z.string().min(1)
})) });
const parseStructuredOutput = ({ raw, schema, task }) => {
	const parsed = schema.safeParse(raw);
	if (!parsed.success) throw new ModelProviderSchemaError({
		issues: parsed.error.issues.map((issue) => ({
			message: issue.message,
			path: issue.path
		})),
		task
	});
	return parsed.data;
};
const isZodErrorLike = (error) => Boolean(error && typeof error === "object" && "issues" in error && Array.isArray(error.issues));
const normalizeStructuredOutputError = ({ error, task }) => {
	if (error instanceof ModelProviderSchemaError) throw error;
	if (isZodErrorLike(error)) throw new ModelProviderSchemaError({
		issues: error.issues.map((issue) => ({
			message: issue.message,
			path: issue.path
		})),
		task
	});
	throw error;
};
const createStructuredOutputOptions = ({ method = "jsonSchema", strict = true } = {}) => {
	if (method === "jsonMode") return { method };
	return {
		method,
		strict
	};
};
const isTextContentPart = (part) => Boolean(part && typeof part === "object" && "text" in part && typeof part.text === "string");
const extractStreamContent = (chunk) => {
	const content = chunk && typeof chunk === "object" && "content" in chunk ? chunk.content : chunk;
	if (typeof content === "string") return content;
	if (Array.isArray(content)) return content.map((part) => {
		if (typeof part === "string") return part;
		if (isTextContentPart(part)) return part.text;
		return "";
	}).join("");
	return "";
};
const buildPublicReportPrompt = ({ context, prompt, title }) => [
	`你是妙剪 Magicut 的视频创作智能体，请生成“${title}”阶段的可公开创作报告。`,
	"只输出给用户看的阶段说明，内容必须依赖用户输入、当前阶段上下文和工具/模型已产生的信息。",
	"不要套用固定标题，不要机械输出“内容理解 / 方案推导 / 执行说明 / 结果摘要”等固定结构。",
	"不要输出隐藏推理链、内部思考、自我校验过程或任何密钥。",
	"文风简洁、具体，使用中文自然段和短列表即可。",
	context ? `上下文：${context}` : void 0,
	`用户输入：${prompt}`
].filter(Boolean).join("\n");
var ArkChatModelProvider = class {
	providerName = "ark";
	model;
	structuredOutput;
	constructor({ createModel = createDefaultChatModel, emit, env, maxRetries, model, structuredOutput, timeout }) {
		const options = {
			apiKey: env.API_KEY,
			configuration: { baseURL: env.BASE_URL },
			maxRetries,
			model: env.LLM_MODEL,
			streamUsage: false,
			timeout
		};
		this.model = model ?? createModel(options);
		this.structuredOutput = createStructuredOutputOptions(structuredOutput);
		emit?.({
			baseURL: env.BASE_URL,
			model: env.LLM_MODEL,
			provider: "ark",
			type: "provider.configured"
		});
	}
	async generateCreativeBrief(input) {
		return this.invokeStructured({
			prompt: buildCreativeBriefPrompt(input),
			schema: CreativeBriefSchema,
			task: "creativeBrief"
		});
	}
	async planScenes(input) {
		return (await this.invokeStructured({
			prompt: buildScenePlannerPrompt(input),
			schema: ScenePlanResponseSchema,
			task: "scenePlanner"
		})).scenes;
	}
	async describeFrames({ frames }) {
		return (await this.invokeStructured({
			prompt: buildFrameDescriptionPrompt({ frames }),
			schema: FrameDescriptionResponseSchema,
			task: "frameDescription"
		})).frames;
	}
	async rankAssetMatches({ candidates, scenes }) {
		const response = await this.invokeStructured({
			prompt: buildAssetMatcherPrompt({
				candidates,
				scenes
			}),
			schema: AssetMatchResponseSchema,
			task: "assetMatcher"
		});
		const candidateAssetIds = new Set(candidates.map((candidate) => candidate.assetId));
		const issues = response.matches.flatMap((match, matchIndex) => match.rankedAssetIds.flatMap((rankedAsset, rankedAssetIndex) => candidateAssetIds.has(rankedAsset.assetId) ? [] : [{
			message: `Matched asset id ${rankedAsset.assetId} is not in candidates`,
			path: [
				"matches",
				matchIndex,
				"rankedAssetIds",
				rankedAssetIndex,
				"assetId"
			]
		}]));
		if (issues.length > 0) throw new ModelProviderSchemaError({
			issues,
			task: "assetMatcher"
		});
		return response.matches;
	}
	async embedTexts({ texts }) {
		if (texts.length === 0) return [];
		return (await this.invokeStructured({
			prompt: [
				"为输入文本生成可用于素材检索的 embedding JSON。",
				"输出严格 JSON，不要包含 Markdown。",
				"JSON 字段：embeddings，每项包含 text 和 embedding。",
				`文本：${JSON.stringify(texts)}`
			].join("\n"),
			schema: TextEmbeddingResponseSchema,
			task: "textEmbedding"
		})).embeddings;
	}
	async streamReport(input, emitDelta) {
		if (!this.model.stream) throw new Error("Chat model does not support streaming");
		const chunks = [];
		const stream = await this.model.stream(buildPublicReportPrompt(input));
		for await (const chunk of stream) {
			const delta = extractStreamContent(chunk);
			if (!delta) continue;
			chunks.push(delta);
			await emitDelta(delta);
		}
		return chunks.join("");
	}
	async invokeStructured({ prompt, schema, task }) {
		let raw;
		try {
			raw = await this.model.withStructuredOutput(schema, this.structuredOutput).invoke(prompt);
		} catch (error) {
			normalizeStructuredOutputError({
				error,
				task
			});
		}
		return parseStructuredOutput({
			raw,
			schema,
			task
		});
	}
};
//#endregion
//#region src/providers/index-tts2-provider.ts
const DEFAULT_SERVER_URL = "http://127.0.0.1:7860";
const CUSTOM_INDEX_TTS2_PREFIX = "custom:index-tts2:";
var IndexTts2ProviderError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "IndexTts2ProviderError";
	}
};
const createCustomIndexTts2VoiceType = (voiceId) => `${CUSTOM_INDEX_TTS2_PREFIX}${voiceId.trim()}`;
const parseCustomIndexTts2VoiceId = (voice) => {
	if (!voice.startsWith(CUSTOM_INDEX_TTS2_PREFIX)) return void 0;
	return voice.slice(18).trim() || void 0;
};
const normalizeServerUrl = (serverUrl) => serverUrl.replace(/\/+$/, "");
const createOutputPath = (outputPath) => {
	if (extname(outputPath).toLowerCase() === ".wav") return outputPath;
	return outputPath.replace(/\.[^/.]+$/, "") + ".wav";
};
const mimeTypeByExtension = /* @__PURE__ */ new Map([
	[".aac", "audio/aac"],
	[".flac", "audio/flac"],
	[".m4a", "audio/mp4"],
	[".mp3", "audio/mpeg"],
	[".ogg", "audio/ogg"],
	[".wav", "audio/wav"]
]);
const createFileData = (filePath) => ({
	meta: { _type: "gradio.FileData" },
	mime_type: mimeTypeByExtension.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
	orig_name: filePath.split(/[\\/]/).at(-1) ?? "reference.wav",
	path: filePath
});
const uploadReferenceAudio = async ({ fetch, filePath, serverUrl }) => {
	const formData = new FormData();
	const fileName = filePath.split(/[\\/]/).at(-1) ?? "reference.wav";
	const fileBuffer = await readFile(filePath);
	formData.append("files", new Blob([fileBuffer], { type: mimeTypeByExtension.get(extname(filePath).toLowerCase()) ?? "application/octet-stream" }), fileName);
	const response = await fetch(`${serverUrl}/gradio_api/upload`, { body: formData });
	await assertOk(response, "IndexTTS2 upload");
	const payload = await response.json();
	if (!Array.isArray(payload) || typeof payload[0] !== "string") throw new IndexTts2ProviderError(`IndexTTS2 upload returned an invalid payload: ${JSON.stringify(payload)}`);
	return payload[0];
};
const parseResultPath = (result) => {
	if (typeof result === "string") return result;
	if (Array.isArray(result) && result.length > 0) return parseResultPath(result[0]);
	if (result && typeof result === "object") {
		const record = result;
		if (typeof record.path === "string") return record.path;
		if (typeof record.value === "string") return record.value;
	}
	throw new IndexTts2ProviderError(`Unsupported IndexTTS2 result: ${JSON.stringify(result)}`);
};
const readCompletedResult = async (response) => {
	const lines = (await response.text()).split(/\r?\n/);
	let eventName = "";
	for (const line of lines) {
		if (line.startsWith("event: ")) {
			eventName = line.slice(7).trim();
			continue;
		}
		if (!line.startsWith("data: ") || eventName !== "complete") continue;
		const payload = line.slice(6).trim();
		if (!payload || payload === "null") continue;
		return JSON.parse(payload);
	}
	throw new IndexTts2ProviderError("IndexTTS2 did not return a completed result");
};
const assertOk = async (response, context) => {
	if (response.ok) return;
	throw new IndexTts2ProviderError(`${context} failed: ${response.status} ${await response.text()}`);
};
var IndexTts2Provider = class {
	fetch;
	ffprobePath;
	maxTextTokensPerSegment;
	probeDuration;
	resolveVoiceReferencePath;
	serverUrl;
	constructor({ fetch = globalThis.fetch.bind(globalThis), ffprobePath = "ffprobe", maxTextTokensPerSegment = 120, probeDuration = probeAudioDuration, resolveVoiceReferencePath, serverUrl = DEFAULT_SERVER_URL }) {
		this.fetch = fetch;
		this.ffprobePath = ffprobePath;
		this.maxTextTokensPerSegment = maxTextTokensPerSegment;
		this.probeDuration = probeDuration;
		this.resolveVoiceReferencePath = resolveVoiceReferencePath;
		this.serverUrl = normalizeServerUrl(serverUrl);
	}
	async synthesizeSpeech({ emit, outputPath, text, voice }) {
		const voiceId = parseCustomIndexTts2VoiceId(voice);
		if (!voiceId) throw new IndexTts2ProviderError(`Unsupported custom voice: ${voice}`);
		try {
			const referencePath = await this.resolveVoiceReferencePath(voiceId);
			const uploadedReferencePath = await uploadReferenceAudio({
				fetch: this.fetch,
				filePath: referencePath,
				serverUrl: this.serverUrl
			});
			emit?.({
				textLength: text.length,
				type: "tts.started",
				voice
			});
			const submitResponse = await this.fetch(`${this.serverUrl}/gradio_api/call/gen_single`, {
				body: JSON.stringify({ data: [
					"Same as the voice reference",
					createFileData(uploadedReferencePath),
					text,
					null,
					.65,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					"",
					false,
					this.maxTextTokensPerSegment,
					true,
					.8,
					30,
					.8,
					0,
					3,
					10,
					1500
				] }),
				headers: { "Content-Type": "application/json" },
				method: "POST"
			});
			await assertOk(submitResponse, "IndexTTS2 submit");
			const submitPayload = await submitResponse.json();
			if (!submitPayload.event_id) throw new IndexTts2ProviderError("IndexTTS2 submit response is missing event_id");
			const streamResponse = await this.fetch(`${this.serverUrl}/gradio_api/call/gen_single/${encodeURIComponent(submitPayload.event_id)}`);
			await assertOk(streamResponse, "IndexTTS2 stream");
			const resultPath = parseResultPath(await readCompletedResult(streamResponse));
			const targetPath = createOutputPath(outputPath);
			await mkdir(dirname(targetPath), { recursive: true });
			await copyFile(resultPath, targetPath);
			const { size } = await stat(targetPath);
			const durationMs = await this.probeDuration({
				ffprobePath: this.ffprobePath,
				filePath: targetPath
			});
			emit?.({
				byteLength: size,
				type: "tts.chunk"
			});
			emit?.({
				byteLength: size,
				durationMs,
				outputPath: targetPath,
				type: "tts.completed"
			});
			return {
				byteLength: size,
				durationMs,
				format: "wav",
				path: targetPath
			};
		} catch (error) {
			const message = serializeError(error);
			emit?.({
				error: message,
				type: "tts.failed"
			});
			if (error instanceof IndexTts2ProviderError) throw new IndexTts2ProviderError(message);
			throw new IndexTts2ProviderError(message);
		}
	}
};
var RoutingTtsProvider = class {
	providers;
	constructor(providers) {
		this.providers = providers;
	}
	synthesizeSpeech(input) {
		if (parseCustomIndexTts2VoiceId(input.voice)) return this.providers.customProvider.synthesizeSpeech(input);
		return this.providers.defaultProvider.synthesizeSpeech(input);
	}
};
//#endregion
//#region src/providers/tts-protocol/types.ts
let MsgType = /* @__PURE__ */ function(MsgType) {
	MsgType[MsgType["FullClientRequest"] = 1] = "FullClientRequest";
	MsgType[MsgType["FullServerResponse"] = 9] = "FullServerResponse";
	MsgType[MsgType["AudioOnlyServer"] = 11] = "AudioOnlyServer";
	MsgType[MsgType["Error"] = 15] = "Error";
	return MsgType;
}({});
let MsgTypeFlag = /* @__PURE__ */ function(MsgTypeFlag) {
	MsgTypeFlag[MsgTypeFlag["NoSeq"] = 0] = "NoSeq";
	MsgTypeFlag[MsgTypeFlag["WithEvent"] = 4] = "WithEvent";
	return MsgTypeFlag;
}({});
let SerializationType = /* @__PURE__ */ function(SerializationType) {
	SerializationType[SerializationType["None"] = 0] = "None";
	SerializationType[SerializationType["Json"] = 1] = "Json";
	return SerializationType;
}({});
let CompressionType = /* @__PURE__ */ function(CompressionType) {
	CompressionType[CompressionType["None"] = 0] = "None";
	return CompressionType;
}({});
let EventType = /* @__PURE__ */ function(EventType) {
	EventType[EventType["StartConnection"] = 1] = "StartConnection";
	EventType[EventType["FinishConnection"] = 2] = "FinishConnection";
	EventType[EventType["ConnectionStarted"] = 50] = "ConnectionStarted";
	EventType[EventType["ConnectionFailed"] = 51] = "ConnectionFailed";
	EventType[EventType["ConnectionFinished"] = 52] = "ConnectionFinished";
	EventType[EventType["StartSession"] = 100] = "StartSession";
	EventType[EventType["CancelSession"] = 101] = "CancelSession";
	EventType[EventType["FinishSession"] = 102] = "FinishSession";
	EventType[EventType["SessionStarted"] = 150] = "SessionStarted";
	EventType[EventType["SessionCanceled"] = 151] = "SessionCanceled";
	EventType[EventType["SessionFinished"] = 152] = "SessionFinished";
	EventType[EventType["SessionFailed"] = 153] = "SessionFailed";
	EventType[EventType["TaskRequest"] = 200] = "TaskRequest";
	EventType[EventType["TtsSentenceStart"] = 350] = "TtsSentenceStart";
	EventType[EventType["TtsSentenceEnd"] = 351] = "TtsSentenceEnd";
	EventType[EventType["TtsResponse"] = 352] = "TtsResponse";
	return EventType;
}({});
//#endregion
//#region src/providers/tts-protocol/frame.ts
const BASE_HEADER_SIZE = 4;
const textEncoder = new TextEncoder();
const isSessionEvent = (event) => Boolean(event && ![
	1,
	2,
	50,
	51,
	52
].includes(event));
const toUint8Array = (value) => {
	if (typeof value === "string") return textEncoder.encode(value);
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
};
const writeInt32 = (value) => {
	const output = /* @__PURE__ */ new Uint8Array(4);
	new DataView(output.buffer).setInt32(0, value);
	return output;
};
const readInt32 = (data, offset) => {
	return new DataView(data.buffer, data.byteOffset, data.byteLength).getInt32(offset);
};
const writeBytes = (bytes) => {
	const output = new Uint8Array(4 + bytes.byteLength);
	output.set(writeInt32(bytes.byteLength), 0);
	output.set(bytes, 4);
	return output;
};
const writeString = (value) => writeBytes(textEncoder.encode(value));
const concat = (parts) => {
	const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
	const output = new Uint8Array(totalLength);
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.byteLength;
	}
	return output;
};
const createTtsMessageFrame = ({ errorCode, event, msgType, payload, sessionId }) => {
	const serialization = msgType === 1 ? 1 : 0;
	const bodyParts = [];
	if (event) bodyParts.push(writeInt32(event));
	if (isSessionEvent(event)) bodyParts.push(writeString(sessionId ?? ""));
	if (msgType === 15) bodyParts.push(writeInt32(errorCode ?? 0));
	bodyParts.push(writeBytes(payload));
	return concat([new Uint8Array([
		17,
		msgType << 4 | 4,
		serialization << 4 | 0,
		0
	]), ...bodyParts]);
};
const parseTtsMessageFrame = (input) => {
	const data = toUint8Array(input);
	if (data.byteLength < BASE_HEADER_SIZE) throw new Error("TTS protocol message is missing its base header");
	const headerSize = (data[0] & 15) * 4;
	const msgType = data[1] >> 4;
	const flag = data[1] & 15;
	let offset = headerSize;
	let event;
	let sessionId;
	let errorCode;
	if (flag === 4) {
		event = readInt32(data, offset);
		offset += 4;
	}
	if (isSessionEvent(event)) {
		const sessionIdLength = readInt32(data, offset);
		offset += 4;
		sessionId = new TextDecoder().decode(data.subarray(offset, offset + sessionIdLength));
		offset += sessionIdLength;
	}
	if (msgType === 15) {
		errorCode = readInt32(data, offset);
		offset += 4;
	}
	const payloadLength = readInt32(data, offset);
	offset += 4;
	return {
		errorCode,
		event,
		msgType,
		payload: data.slice(offset, offset + payloadLength),
		sessionId
	};
};
//#endregion
//#region src/providers/tts-protocol/full-client-request.ts
const fullClientRequest = async (socket, payload, { sessionId = randomUUID() } = {}) => {
	await socket.send(createTtsMessageFrame({
		event: 100,
		msgType: 1,
		payload,
		sessionId
	}));
};
//#endregion
//#region src/providers/tts-protocol/receive-message.ts
const receiveMessage = async (socket) => parseTtsMessageFrame(await socket.receive());
//#endregion
//#region src/providers/volcengine-tts-provider.ts
const DEFAULT_ENDPOINT = "wss://openspeech.bytedance.com/api/v3/plan/tts/unidirectional/stream";
var VolcengineTtsProviderError = class extends Error {
	options;
	constructor(message, options = {}) {
		super(message);
		this.options = options;
		this.name = "VolcengineTtsProviderError";
	}
};
const rawDataToUint8Array = (data) => {
	if (Array.isArray(data)) return Buffer.concat(data);
	if (data instanceof ArrayBuffer) return new Uint8Array(data);
	return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
};
const createWsTtsProtocolSocket = async ({ endpoint, headers }) => new Promise((resolve, reject) => {
	const ws = new WebSocket(endpoint, {
		headers,
		maxPayload: 10 * 1024 * 1024
	});
	const messages = [];
	const waitingReceivers = [];
	let opened = false;
	let closed = false;
	const protocolSocket = {
		close: async () => {
			if (closed || ws.readyState === WebSocket.CLOSED) return;
			await new Promise((closeResolve) => {
				ws.once("close", () => closeResolve());
				ws.close();
			});
		},
		receive: async () => {
			const message = messages.shift();
			if (message) return message;
			if (closed) throw new Error("TTS WebSocket is closed");
			return new Promise((receiveResolve, receiveReject) => {
				waitingReceivers.push({
					reject: receiveReject,
					resolve: receiveResolve
				});
			});
		},
		send: async (data) => {
			await new Promise((sendResolve, sendReject) => {
				ws.send(data, (error) => {
					if (error) {
						sendReject(error);
						return;
					}
					sendResolve();
				});
			});
		}
	};
	ws.once("open", () => {
		opened = true;
		resolve(protocolSocket);
	});
	ws.on("message", (data) => {
		const message = rawDataToUint8Array(data);
		const receiver = waitingReceivers.shift();
		if (receiver) {
			receiver.resolve(message);
			return;
		}
		messages.push(message);
	});
	ws.once("close", () => {
		closed = true;
		for (const receiver of waitingReceivers.splice(0)) receiver.reject(/* @__PURE__ */ new Error("TTS WebSocket closed"));
	});
	ws.once("error", (error) => {
		for (const receiver of waitingReceivers.splice(0)) receiver.reject(error);
		if (!opened) reject(error);
	});
});
var VolcengineTtsProvider = class {
	connect;
	endpoint;
	env;
	ffprobePath;
	format;
	probeDuration;
	sampleRate;
	constructor({ connect = createWsTtsProtocolSocket, endpoint = DEFAULT_ENDPOINT, env, ffprobePath = "ffprobe", format = "mp3", probeDuration = probeAudioDuration, sampleRate = 24e3 }) {
		this.connect = connect;
		this.endpoint = endpoint;
		this.env = env;
		this.ffprobePath = ffprobePath;
		this.format = format;
		this.probeDuration = probeDuration;
		this.sampleRate = sampleRate;
	}
	async synthesizeSpeech({ emit, outputPath, speedRatio, text, voice, volumeRatio }) {
		const socket = await this.connect({
			endpoint: this.endpoint,
			headers: {
				"X-Api-Key": this.env.API_KEY,
				"X-Api-Resource-Id": this.env.TTS_MODEL,
				"X-Control-Require-Usage-Tokens-Return": "*"
			}
		});
		try {
			emit?.({
				textLength: text.length,
				type: "tts.started",
				voice
			});
			await fullClientRequest(socket, new TextEncoder().encode(JSON.stringify({ req_params: {
				audio_params: {
					format: this.format,
					sample_rate: this.sampleRate,
					...typeof speedRatio === "number" ? { speed_ratio: speedRatio } : {},
					...typeof volumeRatio === "number" ? { volume_ratio: volumeRatio } : {}
				},
				speaker: voice,
				text
			} })));
			const chunks = [];
			while (true) {
				const message = await receiveMessage(socket);
				if (message.msgType === 15) throw new VolcengineTtsProviderError(`TTS conversion failed: ${new TextDecoder().decode(message.payload)}`, { errorCode: message.errorCode });
				if (message.msgType === 9 && message.event === 152) break;
				if (message.msgType === 11 && message.payload.byteLength > 0) {
					chunks.push(message.payload);
					emit?.({
						byteLength: message.payload.byteLength,
						type: "tts.chunk"
					});
				}
			}
			const audio = Buffer.concat(chunks);
			if (audio.byteLength === 0) throw new VolcengineTtsProviderError("No audio data received");
			await mkdir(dirname(outputPath), { recursive: true });
			await writeFile(outputPath, audio);
			const durationMs = await this.probeDuration({
				ffprobePath: this.ffprobePath,
				filePath: outputPath
			});
			emit?.({
				byteLength: audio.byteLength,
				durationMs,
				outputPath,
				type: "tts.completed"
			});
			return {
				byteLength: audio.byteLength,
				durationMs,
				format: this.format,
				path: outputPath
			};
		} catch (error) {
			const redactedMessage = serializeError(error);
			emit?.({
				error: redactedMessage,
				type: "tts.failed"
			});
			if (error instanceof VolcengineTtsProviderError) throw new VolcengineTtsProviderError(redactedMessage, error.options);
			throw new VolcengineTtsProviderError(redactedMessage);
		} finally {
			await socket.close();
		}
	}
};
//#endregion
//#region src/storage/schema.sql.ts
const agentDatabaseSchemaStatements = [
	`create table if not exists projects (
        id text primary key,
        title text not null,
        project_path text not null,
        created_at text not null,
        updated_at text not null
    )`,
	`create table if not exists agent_runs (
        id text primary key,
        project_id text not null,
        status text not null,
        started_at text not null,
        completed_at text,
        error_message text,
        foreign key (project_id) references projects(id)
    )`,
	`create table if not exists asset_segments (
        id text primary key,
        project_id text not null,
        asset_id text not null,
        media_type text not null,
        source_path text not null,
        start_ms integer not null,
        end_ms integer not null,
        description text,
        metadata_json text not null,
        foreign key (project_id) references projects(id)
    )`,
	`create table if not exists asset_embeddings (
        id text primary key,
        segment_id text not null,
        model text not null,
        embedding_json text not null,
        created_at text not null,
        foreign key (segment_id) references asset_segments(id)
    )`,
	`create table if not exists graph_checkpoints (
        id text primary key,
        run_id text not null,
        checkpoint_json text not null,
        created_at text not null,
        foreign key (run_id) references agent_runs(id)
    )`,
	`create table if not exists ai_decisions (
        id text primary key,
        run_id text not null,
        node_name text not null,
        decision_json text not null,
        created_at text not null,
        foreign key (run_id) references agent_runs(id)
    )`
];
//#endregion
//#region src/storage/create-agent-database.ts
const require = createRequire(import.meta.url);
const loadSqliteModule = () => require("node:sqlite");
const createAgentDatabase = ({ filename }) => {
	const { DatabaseSync } = loadSqliteModule();
	const database = new DatabaseSync(filename);
	database.exec("pragma foreign_keys = on");
	for (const statement of agentDatabaseSchemaStatements) database.exec(statement);
	return {
		close: () => {
			database.close();
		},
		database
	};
};
//#endregion
export { AgentEnvValidationError, ArkChatModelProvider, AssetMatchCandidateSchema, AssetMatchResponseSchema, AssetMatchSchema, CompressionType, CreativeBriefSchema, EventType, FrameDescriptionInputSchema, FrameDescriptionResponseSchema, FrameDescriptionSchema, IndexTts2Provider, IndexTts2ProviderError, ModelProviderSchemaError, MsgType, MsgTypeFlag, PlannedSceneSchema, RankedAssetSchema, RoutingTtsProvider, ScenePlanResponseSchema, SerializationType, VideoCreationStateAnnotation, VolcengineTtsProvider, VolcengineTtsProviderError, agentDatabaseSchemaStatements, buildAssetMatcherPrompt, buildCreativeBriefPrompt, buildFrameDescriptionPrompt, buildScenePlannerPrompt, createAgentDatabase, createCustomIndexTts2VoiceType, createSequencedEventEmitter, createTtsMessageFrame, createVideoCreationGraph, createWsTtsProtocolSocket, extractKeyframes, fullClientRequest, loadAgentEnv, parseCustomIndexTts2VoiceId, parseTtsMessageFrame, probeAudioDuration, probeMedia, receiveMessage, redactSecrets, serializeError };
