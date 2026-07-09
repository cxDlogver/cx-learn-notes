import { z } from "zod";
//#region src/fixtures/sample-project.ts
const sampleVideoProject = {
	ai: {
		graphVersion: "video-creation-agent@0.1.0",
		provider: "ark-openai-compatible",
		runId: "run_sample_001"
	},
	assets: {
		music: [{
			durationMs: 9e4,
			id: "music_asset_001",
			path: "assets/music/eutopia.mp3",
			title: "Eutopia"
		}],
		subtitles: [{
			id: "subtitle_asset_001",
			styleId: "subtitle_style_default",
			text: "开场提出问题，把学习焦虑拉到观众面前。"
		}],
		thumbnails: [{
			id: "thumbnail_asset_001",
			path: "assets/thumbnails/scene-01.jpg",
			sourceVideoAssetId: "video_asset_001"
		}],
		videos: [{
			durationMs: 12e3,
			fps: 30,
			height: 1080,
			id: "video_asset_001",
			path: "assets/videos/scene-01.mp4",
			thumbnailIds: ["thumbnail_asset_001"],
			width: 1920
		}],
		voices: [{
			durationMs: 8e3,
			id: "voice_asset_001",
			path: "assets/voices/scene-01.mp3",
			provider: "volcengine-seed-tts",
			voice: "zh_female_gaolengyujie_uranus_bigtts"
		}]
	},
	canvas: {
		durationMs: 9e4,
		fps: 30,
		height: 1080,
		safeArea: {
			height: 888,
			width: 1728,
			x: 96,
			y: 96
		},
		width: 1920
	},
	project: {
		createdAt: "2026-06-23T08:00:00.000Z",
		id: "project_sample_001",
		sourcePrompt: "生成一个横屏 AI 学习路线视频",
		title: "前端 AI 学习路线",
		updatedAt: "2026-06-23T08:00:00.000Z"
	},
	render: {
		format: "mp4",
		quality: "preview"
	},
	scenes: [{
		durationMs: 8e3,
		goal: "用问题开场建立共鸣",
		id: "scene_001",
		index: 1,
		matchedVideoAssetIds: ["video_asset_001"],
		notes: "首版示例分镜",
		script: "很多前端同学都在焦虑 AI 到底怎么学。",
		subtitleIds: ["subtitle_asset_001"],
		title: "开场问题",
		visualIntent: "横屏口播画面，节奏清晰",
		voiceAssetId: "voice_asset_001"
	}],
	schemaVersion: "1.0.0",
	tracks: [
		{
			clips: [{
				assetId: "video_asset_001",
				crop: {
					height: 1080,
					width: 1920,
					x: 0,
					y: 0
				},
				endMs: 8e3,
				id: "video_clip_001",
				kind: "video",
				sceneId: "scene_001",
				sourceEndMs: 8e3,
				sourceStartMs: 0,
				startMs: 0,
				transform: {
					rotation: 0,
					scale: 1,
					x: 0,
					y: 0
				}
			}],
			id: "track_video_001",
			kind: "video",
			label: "视频"
		},
		{
			clips: [{
				assetId: "voice_asset_001",
				endMs: 8e3,
				id: "voice_clip_001",
				kind: "voice",
				sceneId: "scene_001",
				startMs: 0,
				voicePreset: "zh_female_gaolengyujie_uranus_bigtts"
			}],
			id: "track_voice_001",
			kind: "voice",
			label: "配音"
		},
		{
			clips: [{
				endMs: 8e3,
				id: "subtitle_clip_001",
				kind: "subtitle",
				sceneId: "scene_001",
				startMs: 0,
				styleId: "subtitle_style_default",
				subtitleId: "subtitle_asset_001",
				text: "开场提出问题，把学习焦虑拉到观众面前。"
			}],
			id: "track_subtitle_001",
			kind: "subtitle",
			label: "字幕"
		},
		{
			clips: [{
				assetId: "music_asset_001",
				endMs: 9e4,
				fadeInMs: 1200,
				fadeOutMs: 1800,
				id: "music_clip_001",
				kind: "music",
				sourceEndMs: 9e4,
				sourceStartMs: 0,
				startMs: 0,
				volume: .28
			}],
			id: "track_music_001",
			kind: "music",
			label: "音乐"
		}
	]
};
//#endregion
//#region src/schema.ts
const idSchema = z.string().min(1);
const isoDateSchema = z.string().datetime({ offset: true });
const timeMsSchema = z.number().int().nonnegative();
const safeAreaSchema = z.object({
	height: z.number().int().positive(),
	width: z.number().int().positive(),
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative()
});
const clipBaseSchema = z.object({
	endMs: timeMsSchema,
	id: idSchema,
	sceneId: idSchema.optional(),
	startMs: timeMsSchema
});
const cropSchema = z.object({
	height: z.number().positive(),
	width: z.number().positive(),
	x: z.number().nonnegative(),
	y: z.number().nonnegative()
});
const transformSchema = z.object({
	rotation: z.number(),
	scale: z.number().positive(),
	x: z.number(),
	y: z.number()
});
const VideoClipSchema = clipBaseSchema.extend({
	assetId: idSchema,
	crop: cropSchema,
	kind: z.literal("video"),
	sourceEndMs: timeMsSchema,
	sourceStartMs: timeMsSchema,
	transform: transformSchema
});
const VoiceClipSchema = clipBaseSchema.extend({
	assetId: idSchema,
	kind: z.literal("voice"),
	voicePreset: idSchema
});
const SubtitleClipSchema = clipBaseSchema.extend({
	kind: z.literal("subtitle"),
	subtitleId: idSchema,
	styleId: idSchema,
	text: z.string().min(1)
});
const MusicClipSchema = clipBaseSchema.extend({
	assetId: idSchema,
	fadeInMs: timeMsSchema,
	fadeOutMs: timeMsSchema,
	kind: z.literal("music"),
	sourceEndMs: timeMsSchema,
	sourceStartMs: timeMsSchema,
	volume: z.number().min(0).max(1)
});
const TimelineClipSchema = z.discriminatedUnion("kind", [
	VideoClipSchema,
	VoiceClipSchema,
	SubtitleClipSchema,
	MusicClipSchema
]);
const TimelineTrackKindSchema = z.enum([
	"video",
	"voice",
	"subtitle",
	"music"
]);
const TimelineTrackSchema = z.object({
	clips: z.array(TimelineClipSchema),
	id: idSchema,
	kind: TimelineTrackKindSchema,
	label: z.string().min(1)
});
const videoAssetSchema = z.object({
	durationMs: timeMsSchema,
	fps: z.number().positive(),
	height: z.number().int().positive(),
	id: idSchema,
	path: z.string().min(1),
	thumbnailIds: z.array(idSchema),
	width: z.number().int().positive()
});
const voiceAssetSchema = z.object({
	durationMs: timeMsSchema,
	id: idSchema,
	path: z.string().min(1),
	provider: z.string().min(1),
	voice: z.string().min(1)
});
const musicAssetSchema = z.object({
	durationMs: timeMsSchema,
	id: idSchema,
	path: z.string().min(1),
	title: z.string().min(1)
});
const subtitleAssetSchema = z.object({
	id: idSchema,
	styleId: idSchema,
	text: z.string().min(1)
});
const thumbnailAssetSchema = z.object({
	id: idSchema,
	path: z.string().min(1),
	sourceVideoAssetId: idSchema
});
const ProjectAssetsSchema = z.object({
	music: z.array(musicAssetSchema),
	subtitles: z.array(subtitleAssetSchema),
	thumbnails: z.array(thumbnailAssetSchema),
	videos: z.array(videoAssetSchema),
	voices: z.array(voiceAssetSchema)
});
const SceneSchema = z.object({
	durationMs: timeMsSchema,
	goal: z.string().min(1),
	id: idSchema,
	index: z.number().int().positive(),
	matchedVideoAssetIds: z.array(idSchema),
	notes: z.string(),
	script: z.string().min(1),
	subtitleIds: z.array(idSchema),
	title: z.string().min(1),
	visualIntent: z.string().min(1),
	voiceAssetId: idSchema
});
const CanvasConfigSchema = z.object({
	durationMs: timeMsSchema,
	fps: z.number().positive(),
	height: z.number().int().positive(),
	safeArea: safeAreaSchema,
	width: z.number().int().positive()
});
const ProjectMetadataSchema = z.object({
	createdAt: isoDateSchema,
	id: idSchema,
	sourcePrompt: z.string().min(1),
	title: z.string().min(1),
	updatedAt: isoDateSchema
});
const RenderConfigSchema = z.object({
	format: z.enum(["mp4"]),
	quality: z.enum(["preview", "final"])
});
const AiRunMetadataSchema = z.object({
	graphVersion: z.string().min(1),
	provider: z.string().min(1),
	runId: idSchema
});
const addIssue = ({ context, message, path }) => {
	context.addIssue({
		code: z.ZodIssueCode.custom,
		message,
		path
	});
};
const VideoProjectSchema = z.object({
	ai: AiRunMetadataSchema,
	assets: ProjectAssetsSchema,
	canvas: CanvasConfigSchema,
	project: ProjectMetadataSchema,
	render: RenderConfigSchema,
	scenes: z.array(SceneSchema),
	schemaVersion: z.literal("1.0.0"),
	tracks: z.array(TimelineTrackSchema)
}).superRefine((project, context) => {
	const videoAssetIds = new Set(project.assets.videos.map((asset) => asset.id));
	const voiceAssetIds = new Set(project.assets.voices.map((asset) => asset.id));
	const musicAssetIds = new Set(project.assets.music.map((asset) => asset.id));
	const subtitleAssetIds = new Set(project.assets.subtitles.map((asset) => asset.id));
	project.tracks.forEach((track, trackIndex) => {
		track.clips.forEach((clip, clipIndex) => {
			const clipPath = [
				"tracks",
				trackIndex,
				"clips",
				clipIndex
			];
			if (clip.endMs <= clip.startMs) addIssue({
				context,
				message: "Clip endMs must be greater than startMs",
				path: [...clipPath, "endMs"]
			});
			if (clip.kind !== track.kind) addIssue({
				context,
				message: `Track ${track.kind} contains invalid clip kind ${clip.kind}`,
				path: [...clipPath, "kind"]
			});
			if (clip.kind === "video" && !videoAssetIds.has(clip.assetId)) addIssue({
				context,
				message: `Video clip references missing asset ${clip.assetId}`,
				path: [...clipPath, "assetId"]
			});
			if (clip.kind === "voice" && !voiceAssetIds.has(clip.assetId)) addIssue({
				context,
				message: `Voice clip references missing asset ${clip.assetId}`,
				path: [...clipPath, "assetId"]
			});
			if (clip.kind === "subtitle" && !subtitleAssetIds.has(clip.subtitleId)) addIssue({
				context,
				message: `Subtitle clip references missing subtitle ${clip.subtitleId}`,
				path: [...clipPath, "subtitleId"]
			});
			if (clip.kind === "music" && !musicAssetIds.has(clip.assetId)) addIssue({
				context,
				message: `Music clip references missing asset ${clip.assetId}`,
				path: [...clipPath, "assetId"]
			});
		});
	});
});
//#endregion
//#region src/validation.ts
var VideoProjectValidationError = class extends Error {
	issues;
	constructor(issues) {
		super(issues.join("\n"));
		this.issues = issues;
		this.name = "VideoProjectValidationError";
	}
};
const formatIssue = (issue) => {
	return `${issue.path.map(String).join(".") || "project"}: ${issue.message}`;
};
const validateVideoProject = (value) => {
	const result = VideoProjectSchema.safeParse(value);
	if (!result.success) return {
		issues: result.error.issues.map(formatIssue),
		success: false
	};
	return {
		data: result.data,
		success: true
	};
};
const assertVideoProject = (value) => {
	const result = validateVideoProject(value);
	if (result.success === false) throw new VideoProjectValidationError(result.issues);
	return result.data;
};
//#endregion
export { AiRunMetadataSchema, CanvasConfigSchema, MusicClipSchema, ProjectAssetsSchema, ProjectMetadataSchema, RenderConfigSchema, SceneSchema, SubtitleClipSchema, TimelineClipSchema, TimelineTrackKindSchema, TimelineTrackSchema, VideoClipSchema, VideoProjectSchema, VideoProjectValidationError, VoiceClipSchema, assertVideoProject, sampleVideoProject, validateVideoProject };
