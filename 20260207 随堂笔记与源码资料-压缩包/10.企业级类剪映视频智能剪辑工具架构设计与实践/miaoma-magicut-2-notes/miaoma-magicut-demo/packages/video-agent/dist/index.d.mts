import { ZodIssue, ZodType, z } from "zod";
import { BaseCheckpointSaver } from "@langchain/langgraph";
import { VideoProject } from "@miaoma-magicut/video-project";
import { DatabaseSync } from "node:sqlite";

//#region src/audio/probe-audio-duration.d.ts
type ExecFileResult = {
  stderr: string;
  stdout: string;
};
type ExecFile = (file: string, args: string[]) => Promise<ExecFileResult>;
declare const probeAudioDuration: ({
  execFile,
  ffprobePath,
  filePath
}: {
  execFile?: ExecFile;
  ffprobePath: string;
  filePath: string;
}) => Promise<number>;
//#endregion
//#region src/config/load-agent-env.d.ts
declare const AgentEnvSchema: z.ZodObject<{
  LLM_MODEL: z.ZodString;
  TTS_MODEL: z.ZodString;
  BASE_URL: z.ZodString;
  API_KEY: z.ZodString;
}, z.core.$strip>;
type AgentEnv = z.infer<typeof AgentEnvSchema>;
type AgentEnvIssue = {
  field: string;
  message: string;
};
type EnvironmentValues = Record<string, string | undefined>;
declare class AgentEnvValidationError extends Error {
  readonly issues: AgentEnvIssue[];
  constructor(issues: AgentEnvIssue[]);
}
declare const loadAgentEnv: ({
  envFilePath,
  processEnv
}?: {
  envFilePath?: string;
  processEnv?: EnvironmentValues;
}) => AgentEnv;
//#endregion
//#region src/events/agent-run-event.d.ts
type AgentRunEventBase = {
  createdAt: string;
  runId: string;
  sequence: number;
};
type AgentRunEvent = (AgentRunEventBase & {
  input: {
    prompt: string;
    sourceAssetDirectory: string;
  };
  type: 'run.started';
}) | (AgentRunEventBase & {
  nodeName: string;
  type: 'node.started';
}) | (AgentRunEventBase & {
  nodeName: string;
  type: 'node.completed';
}) | (AgentRunEventBase & {
  error: string;
  nodeName: string;
  type: 'node.failed';
}) | (AgentRunEventBase & {
  messageId: string;
  nodeName: string;
  title: string;
  type: 'model.stream.started';
}) | (AgentRunEventBase & {
  delta: string;
  messageId: string;
  nodeName: string;
  type: 'model.stream.delta';
}) | (AgentRunEventBase & {
  messageId: string;
  nodeName: string;
  type: 'model.stream.completed';
}) | (AgentRunEventBase & {
  approval: {
    payload: unknown;
    type: string;
  };
  type: 'approval.required';
}) | (AgentRunEventBase & {
  projectId: string;
  savedProjectPath?: string;
  type: 'run.completed';
}) | (AgentRunEventBase & {
  error: string;
  type: 'run.failed';
});
//#endregion
//#region src/events/event-emitter.d.ts
type AgentRunEventInput = AgentRunEvent extends infer Event ? Event extends AgentRunEventBase ? Omit<Event, keyof AgentRunEventBase> : never : never;
type AgentRunEventEmitter = (event: AgentRunEvent) => void;
declare const redactSecrets: (value: string) => string;
declare const serializeError: (error: unknown) => string;
declare const createSequencedEventEmitter: ({
  emit,
  runId
}: {
  emit?: AgentRunEventEmitter;
  runId: string;
}) => {
  emit: (event: AgentRunEventInput) => void;
};
//#endregion
//#region src/prompts/creative-brief.d.ts
declare const CreativeBriefSchema: z.ZodObject<{
  audience: z.ZodString;
  keyMessages: z.ZodArray<z.ZodString>;
  summary: z.ZodString;
  title: z.ZodString;
  tone: z.ZodString;
  visualStyle: z.ZodString;
}, z.core.$strip>;
type CreativeBrief = z.infer<typeof CreativeBriefSchema>;
type CreativeBriefInput = {
  prompt: string;
  sourceAssetSummaries: string[];
};
declare const buildCreativeBriefPrompt: ({
  prompt,
  sourceAssetSummaries
}: CreativeBriefInput) => string;
//#endregion
//#region src/prompts/scene-planner.d.ts
declare const PlannedSceneSchema: z.ZodObject<{
  durationMs: z.ZodNumber;
  goal: z.ZodString;
  id: z.ZodString;
  index: z.ZodNumber;
  script: z.ZodString;
  subtitleLines: z.ZodArray<z.ZodString>;
  title: z.ZodString;
  visualIntent: z.ZodString;
}, z.core.$strip>;
declare const ScenePlanResponseSchema: z.ZodObject<{
  scenes: z.ZodArray<z.ZodObject<{
    durationMs: z.ZodNumber;
    goal: z.ZodString;
    id: z.ZodString;
    index: z.ZodNumber;
    script: z.ZodString;
    subtitleLines: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    visualIntent: z.ZodString;
  }, z.core.$strip>>;
}, z.core.$strip>;
type PlannedScene = z.infer<typeof PlannedSceneSchema>;
type ScenePlanInput = {
  brief: unknown;
  targetSceneCount?: number;
};
declare const buildScenePlannerPrompt: ({
  brief,
  targetSceneCount
}: ScenePlanInput) => string;
//#endregion
//#region src/prompts/asset-matcher.d.ts
declare const AssetMatchCandidateSchema: z.ZodObject<{
  assetId: z.ZodString;
  description: z.ZodString;
  durationMs: z.ZodNumber;
}, z.core.$strip>;
declare const RankedAssetSchema: z.ZodObject<{
  assetId: z.ZodString;
  reason: z.ZodString;
  score: z.ZodNumber;
}, z.core.$strip>;
declare const AssetMatchSchema: z.ZodObject<{
  rankedAssetIds: z.ZodArray<z.ZodObject<{
    assetId: z.ZodString;
    reason: z.ZodString;
    score: z.ZodNumber;
  }, z.core.$strip>>;
  sceneId: z.ZodString;
}, z.core.$strip>;
declare const AssetMatchResponseSchema: z.ZodObject<{
  matches: z.ZodArray<z.ZodObject<{
    rankedAssetIds: z.ZodArray<z.ZodObject<{
      assetId: z.ZodString;
      reason: z.ZodString;
      score: z.ZodNumber;
    }, z.core.$strip>>;
    sceneId: z.ZodString;
  }, z.core.$strip>>;
}, z.core.$strip>;
type AssetMatchCandidate = z.infer<typeof AssetMatchCandidateSchema>;
type AssetMatchRanking = z.infer<typeof AssetMatchSchema>;
declare const buildAssetMatcherPrompt: ({
  candidates,
  scenes
}: {
  candidates: AssetMatchCandidate[];
  scenes: unknown[];
}) => string;
//#endregion
//#region src/prompts/frame-description.d.ts
declare const FrameDescriptionInputSchema: z.ZodObject<{
  frameId: z.ZodString;
  imagePath: z.ZodString;
}, z.core.$strip>;
declare const FrameDescriptionSchema: z.ZodObject<{
  actions: z.ZodArray<z.ZodString>;
  description: z.ZodString;
  frameId: z.ZodString;
  mood: z.ZodString;
  objects: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
declare const FrameDescriptionResponseSchema: z.ZodObject<{
  frames: z.ZodArray<z.ZodObject<{
    actions: z.ZodArray<z.ZodString>;
    description: z.ZodString;
    frameId: z.ZodString;
    mood: z.ZodString;
    objects: z.ZodArray<z.ZodString>;
  }, z.core.$strip>>;
}, z.core.$strip>;
type FrameDescription = z.infer<typeof FrameDescriptionSchema>;
type FrameDescriptionInput = z.infer<typeof FrameDescriptionInputSchema>;
declare const buildFrameDescriptionPrompt: ({
  frames
}: {
  frames: FrameDescriptionInput[];
}) => string;
//#endregion
//#region src/providers/model-provider.d.ts
type TextEmbedding = {
  embedding: number[];
  text: string;
};
type ModelReportInput = {
  context?: string;
  prompt: string;
  title: string;
};
type ModelProvider = {
  embedTexts: (input: {
    texts: string[];
  }) => Promise<TextEmbedding[]>;
  streamReport?: (input: ModelReportInput, emitDelta: (delta: string) => void | Promise<void>) => Promise<string>;
  generateCreativeBrief: (input: CreativeBriefInput) => Promise<CreativeBrief>;
  describeFrames: (input: {
    frames: FrameDescriptionInput[];
  }) => Promise<FrameDescription[]>;
  planScenes: (input: ScenePlanInput) => Promise<PlannedScene[]>;
  rankAssetMatches: (input: {
    candidates: AssetMatchCandidate[];
    scenes: PlannedScene[];
  }) => Promise<AssetMatchRanking[]>;
};
//#endregion
//#region src/tools/video-agent-tools.d.ts
type AssetAnalysis = {
  assetId: string;
  description: string;
  durationMs: number;
};
type AssetMatchResult = {
  rankedAssetIds: {
    assetId: string;
    reason: string;
    score: number;
  }[];
  sceneId: string;
};
type VoiceSynthesisResult = {
  assetId: string;
  durationMs: number;
  lineIndex: number;
  path: string;
  sceneId: string;
  text: string;
};
type VideoCreationInput = {
  prompt: string;
  runId: string;
  selectedVoiceType?: string;
  sourceAssetDirectory: string;
};
type ProjectValidationResult = {
  success: true;
} | {
  error: string;
  success: false;
};
type SavedVideoProject = {
  path: string;
  project: VideoProject;
};
type VideoAgentTools = {
  analyzeAssets: (input: {
    assets: AssetAnalysis[];
    input: VideoCreationInput;
  }) => Promise<AssetAnalysis[]>;
  assembleTimeline: (input: {
    assets: AssetAnalysis[];
    brief: CreativeBrief;
    input: VideoCreationInput;
    matches: AssetMatchResult[];
    scenes: PlannedScene[];
    voices: VoiceSynthesisResult[];
  }) => Promise<VideoProject>;
  generateCreativeBrief: (input: {
    assets: AssetAnalysis[];
    input: VideoCreationInput;
  }) => Promise<CreativeBrief>;
  matchAssets: (input: {
    assets: AssetAnalysis[];
    input: VideoCreationInput;
    scenes: PlannedScene[];
  }) => Promise<AssetMatchResult[]>;
  planScenes: (input: {
    assets: AssetAnalysis[];
    brief: CreativeBrief;
    input: VideoCreationInput;
  }) => Promise<PlannedScene[]>;
  saveProject: (input: {
    project: VideoProject;
  }) => Promise<SavedVideoProject>;
  scanAssets: (input: {
    input: VideoCreationInput;
  }) => Promise<AssetAnalysis[]>;
  streamReport?: (input: ModelReportInput, emitDelta: (delta: string) => void | Promise<void>) => Promise<string>;
  synthesizeVoice: (input: {
    brief: CreativeBrief;
    input: VideoCreationInput;
    scenes: PlannedScene[];
  }) => Promise<VoiceSynthesisResult[]>;
  validateProject: (input: {
    project: VideoProject;
  }) => Promise<ProjectValidationResult>;
};
//#endregion
//#region src/graph/state.d.ts
type SceneApprovalResume = {
  approved: boolean;
};
type SceneApprovalRequest = {
  payload: {
    brief?: CreativeBrief;
    scenes: PlannedScene[];
  };
  type: 'scene-plan';
};
declare const VideoCreationStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
  assets: {
    (annotation: import("@langchain/langgraph").SingleReducer<AssetAnalysis[], AssetAnalysis[]>): import("@langchain/langgraph").BaseChannel<AssetAnalysis[], AssetAnalysis[] | import("@langchain/langgraph").OverwriteValue<AssetAnalysis[]>, unknown>;
    (): import("@langchain/langgraph").LastValue<AssetAnalysis[]>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  brief: {
    (annotation: import("@langchain/langgraph").SingleReducer<{
      audience: string;
      keyMessages: string[];
      summary: string;
      title: string;
      tone: string;
      visualStyle: string;
    } | undefined, {
      audience: string;
      keyMessages: string[];
      summary: string;
      title: string;
      tone: string;
      visualStyle: string;
    } | undefined>): import("@langchain/langgraph").BaseChannel<{
      audience: string;
      keyMessages: string[];
      summary: string;
      title: string;
      tone: string;
      visualStyle: string;
    } | undefined, {
      audience: string;
      keyMessages: string[];
      summary: string;
      title: string;
      tone: string;
      visualStyle: string;
    } | import("@langchain/langgraph").OverwriteValue<{
      audience: string;
      keyMessages: string[];
      summary: string;
      title: string;
      tone: string;
      visualStyle: string;
    } | undefined> | undefined, unknown>;
    (): import("@langchain/langgraph").LastValue<{
      audience: string;
      keyMessages: string[];
      summary: string;
      title: string;
      tone: string;
      visualStyle: string;
    } | undefined>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  errors: {
    (annotation: import("@langchain/langgraph").SingleReducer<string[], string[]>): import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    (): import("@langchain/langgraph").LastValue<string[]>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  input: {
    (annotation: import("@langchain/langgraph").SingleReducer<VideoCreationInput | undefined, VideoCreationInput | undefined>): import("@langchain/langgraph").BaseChannel<VideoCreationInput | undefined, VideoCreationInput | import("@langchain/langgraph").OverwriteValue<VideoCreationInput | undefined> | undefined, unknown>;
    (): import("@langchain/langgraph").LastValue<VideoCreationInput | undefined>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  matches: {
    (annotation: import("@langchain/langgraph").SingleReducer<AssetMatchResult[], AssetMatchResult[]>): import("@langchain/langgraph").BaseChannel<AssetMatchResult[], AssetMatchResult[] | import("@langchain/langgraph").OverwriteValue<AssetMatchResult[]>, unknown>;
    (): import("@langchain/langgraph").LastValue<AssetMatchResult[]>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  project: {
    (annotation: import("@langchain/langgraph").SingleReducer<{
      ai: {
        graphVersion: string;
        provider: string;
        runId: string;
        conversation?: {
          content: string;
          createdAt: string;
          role: "assistant" | "system" | "user";
          sequence: number;
          blocks?: ({
            text: string;
            type: "heading";
          } | {
            text: string;
            type: "paragraph";
          } | {
            items: string[];
            type: "bullets";
          } | {
            items: {
              key: string;
              value: string;
            }[];
            type: "key-values";
          } | {
            columns: string[];
            rows: string[][];
            type: "table";
          } | {
            items: {
              label: string;
              status: "cancelled" | "completed" | "failed" | "running" | "waiting";
              detail?: string | undefined;
            }[];
            type: "progress";
          })[] | undefined;
          nodeName?: string | undefined;
          sourceEventType?: string | undefined;
          tone?: "cancelled" | "completed" | "failed" | "running" | "waiting" | undefined;
        }[] | undefined;
      };
      assets: {
        music: {
          durationMs: number;
          id: string;
          path: string;
          title: string;
        }[];
        subtitles: {
          id: string;
          styleId: string;
          text: string;
        }[];
        thumbnails: {
          id: string;
          path: string;
          sourceVideoAssetId: string;
        }[];
        videos: {
          durationMs: number;
          fps: number;
          height: number;
          id: string;
          path: string;
          thumbnailIds: string[];
          width: number;
        }[];
        voices: {
          durationMs: number;
          id: string;
          path: string;
          provider: string;
          voice: string;
        }[];
      };
      canvas: {
        durationMs: number;
        fps: number;
        height: number;
        safeArea: {
          height: number;
          width: number;
          x: number;
          y: number;
        };
        width: number;
      };
      project: {
        createdAt: string;
        id: string;
        sourcePrompt: string;
        title: string;
        updatedAt: string;
      };
      render: {
        format: "mp4";
        quality: "preview" | "final";
      };
      scenes: {
        durationMs: number;
        goal: string;
        id: string;
        index: number;
        matchedVideoAssetIds: string[];
        notes: string;
        script: string;
        subtitleIds: string[];
        title: string;
        visualIntent: string;
        voiceAssetId: string;
      }[];
      schemaVersion: "1.0.0";
      tracks: {
        clips: ({
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          crop: {
            height: number;
            width: number;
            x: number;
            y: number;
          };
          kind: "video";
          sourceEndMs: number;
          sourceStartMs: number;
          transform: {
            rotation: number;
            scale: number;
            x: number;
            y: number;
          };
          sceneId?: string | undefined;
          speed?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          kind: "voice";
          voicePreset: string;
          sceneId?: string | undefined;
          speed?: number | undefined;
          volume?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          kind: "subtitle";
          subtitleId: string;
          styleId: string;
          text: string;
          sceneId?: string | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          fadeInMs: number;
          fadeOutMs: number;
          kind: "music";
          sourceEndMs: number;
          sourceStartMs: number;
          volume: number;
          sceneId?: string | undefined;
        })[];
        id: string;
        kind: "music" | "voice" | "video" | "subtitle";
        label: string;
      }[];
    } | undefined, {
      ai: {
        graphVersion: string;
        provider: string;
        runId: string;
        conversation?: {
          content: string;
          createdAt: string;
          role: "assistant" | "system" | "user";
          sequence: number;
          blocks?: ({
            text: string;
            type: "heading";
          } | {
            text: string;
            type: "paragraph";
          } | {
            items: string[];
            type: "bullets";
          } | {
            items: {
              key: string;
              value: string;
            }[];
            type: "key-values";
          } | {
            columns: string[];
            rows: string[][];
            type: "table";
          } | {
            items: {
              label: string;
              status: "cancelled" | "completed" | "failed" | "running" | "waiting";
              detail?: string | undefined;
            }[];
            type: "progress";
          })[] | undefined;
          nodeName?: string | undefined;
          sourceEventType?: string | undefined;
          tone?: "cancelled" | "completed" | "failed" | "running" | "waiting" | undefined;
        }[] | undefined;
      };
      assets: {
        music: {
          durationMs: number;
          id: string;
          path: string;
          title: string;
        }[];
        subtitles: {
          id: string;
          styleId: string;
          text: string;
        }[];
        thumbnails: {
          id: string;
          path: string;
          sourceVideoAssetId: string;
        }[];
        videos: {
          durationMs: number;
          fps: number;
          height: number;
          id: string;
          path: string;
          thumbnailIds: string[];
          width: number;
        }[];
        voices: {
          durationMs: number;
          id: string;
          path: string;
          provider: string;
          voice: string;
        }[];
      };
      canvas: {
        durationMs: number;
        fps: number;
        height: number;
        safeArea: {
          height: number;
          width: number;
          x: number;
          y: number;
        };
        width: number;
      };
      project: {
        createdAt: string;
        id: string;
        sourcePrompt: string;
        title: string;
        updatedAt: string;
      };
      render: {
        format: "mp4";
        quality: "preview" | "final";
      };
      scenes: {
        durationMs: number;
        goal: string;
        id: string;
        index: number;
        matchedVideoAssetIds: string[];
        notes: string;
        script: string;
        subtitleIds: string[];
        title: string;
        visualIntent: string;
        voiceAssetId: string;
      }[];
      schemaVersion: "1.0.0";
      tracks: {
        clips: ({
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          crop: {
            height: number;
            width: number;
            x: number;
            y: number;
          };
          kind: "video";
          sourceEndMs: number;
          sourceStartMs: number;
          transform: {
            rotation: number;
            scale: number;
            x: number;
            y: number;
          };
          sceneId?: string | undefined;
          speed?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          kind: "voice";
          voicePreset: string;
          sceneId?: string | undefined;
          speed?: number | undefined;
          volume?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          kind: "subtitle";
          subtitleId: string;
          styleId: string;
          text: string;
          sceneId?: string | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          fadeInMs: number;
          fadeOutMs: number;
          kind: "music";
          sourceEndMs: number;
          sourceStartMs: number;
          volume: number;
          sceneId?: string | undefined;
        })[];
        id: string;
        kind: "music" | "voice" | "video" | "subtitle";
        label: string;
      }[];
    } | undefined>): import("@langchain/langgraph").BaseChannel<{
      ai: {
        graphVersion: string;
        provider: string;
        runId: string;
        conversation?: {
          content: string;
          createdAt: string;
          role: "assistant" | "system" | "user";
          sequence: number;
          blocks?: ({
            text: string;
            type: "heading";
          } | {
            text: string;
            type: "paragraph";
          } | {
            items: string[];
            type: "bullets";
          } | {
            items: {
              key: string;
              value: string;
            }[];
            type: "key-values";
          } | {
            columns: string[];
            rows: string[][];
            type: "table";
          } | {
            items: {
              label: string;
              status: "cancelled" | "completed" | "failed" | "running" | "waiting";
              detail?: string | undefined;
            }[];
            type: "progress";
          })[] | undefined;
          nodeName?: string | undefined;
          sourceEventType?: string | undefined;
          tone?: "cancelled" | "completed" | "failed" | "running" | "waiting" | undefined;
        }[] | undefined;
      };
      assets: {
        music: {
          durationMs: number;
          id: string;
          path: string;
          title: string;
        }[];
        subtitles: {
          id: string;
          styleId: string;
          text: string;
        }[];
        thumbnails: {
          id: string;
          path: string;
          sourceVideoAssetId: string;
        }[];
        videos: {
          durationMs: number;
          fps: number;
          height: number;
          id: string;
          path: string;
          thumbnailIds: string[];
          width: number;
        }[];
        voices: {
          durationMs: number;
          id: string;
          path: string;
          provider: string;
          voice: string;
        }[];
      };
      canvas: {
        durationMs: number;
        fps: number;
        height: number;
        safeArea: {
          height: number;
          width: number;
          x: number;
          y: number;
        };
        width: number;
      };
      project: {
        createdAt: string;
        id: string;
        sourcePrompt: string;
        title: string;
        updatedAt: string;
      };
      render: {
        format: "mp4";
        quality: "preview" | "final";
      };
      scenes: {
        durationMs: number;
        goal: string;
        id: string;
        index: number;
        matchedVideoAssetIds: string[];
        notes: string;
        script: string;
        subtitleIds: string[];
        title: string;
        visualIntent: string;
        voiceAssetId: string;
      }[];
      schemaVersion: "1.0.0";
      tracks: {
        clips: ({
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          crop: {
            height: number;
            width: number;
            x: number;
            y: number;
          };
          kind: "video";
          sourceEndMs: number;
          sourceStartMs: number;
          transform: {
            rotation: number;
            scale: number;
            x: number;
            y: number;
          };
          sceneId?: string | undefined;
          speed?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          kind: "voice";
          voicePreset: string;
          sceneId?: string | undefined;
          speed?: number | undefined;
          volume?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          kind: "subtitle";
          subtitleId: string;
          styleId: string;
          text: string;
          sceneId?: string | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          fadeInMs: number;
          fadeOutMs: number;
          kind: "music";
          sourceEndMs: number;
          sourceStartMs: number;
          volume: number;
          sceneId?: string | undefined;
        })[];
        id: string;
        kind: "music" | "voice" | "video" | "subtitle";
        label: string;
      }[];
    } | undefined, {
      ai: {
        graphVersion: string;
        provider: string;
        runId: string;
        conversation?: {
          content: string;
          createdAt: string;
          role: "assistant" | "system" | "user";
          sequence: number;
          blocks?: ({
            text: string;
            type: "heading";
          } | {
            text: string;
            type: "paragraph";
          } | {
            items: string[];
            type: "bullets";
          } | {
            items: {
              key: string;
              value: string;
            }[];
            type: "key-values";
          } | {
            columns: string[];
            rows: string[][];
            type: "table";
          } | {
            items: {
              label: string;
              status: "cancelled" | "completed" | "failed" | "running" | "waiting";
              detail?: string | undefined;
            }[];
            type: "progress";
          })[] | undefined;
          nodeName?: string | undefined;
          sourceEventType?: string | undefined;
          tone?: "cancelled" | "completed" | "failed" | "running" | "waiting" | undefined;
        }[] | undefined;
      };
      assets: {
        music: {
          durationMs: number;
          id: string;
          path: string;
          title: string;
        }[];
        subtitles: {
          id: string;
          styleId: string;
          text: string;
        }[];
        thumbnails: {
          id: string;
          path: string;
          sourceVideoAssetId: string;
        }[];
        videos: {
          durationMs: number;
          fps: number;
          height: number;
          id: string;
          path: string;
          thumbnailIds: string[];
          width: number;
        }[];
        voices: {
          durationMs: number;
          id: string;
          path: string;
          provider: string;
          voice: string;
        }[];
      };
      canvas: {
        durationMs: number;
        fps: number;
        height: number;
        safeArea: {
          height: number;
          width: number;
          x: number;
          y: number;
        };
        width: number;
      };
      project: {
        createdAt: string;
        id: string;
        sourcePrompt: string;
        title: string;
        updatedAt: string;
      };
      render: {
        format: "mp4";
        quality: "preview" | "final";
      };
      scenes: {
        durationMs: number;
        goal: string;
        id: string;
        index: number;
        matchedVideoAssetIds: string[];
        notes: string;
        script: string;
        subtitleIds: string[];
        title: string;
        visualIntent: string;
        voiceAssetId: string;
      }[];
      schemaVersion: "1.0.0";
      tracks: {
        clips: ({
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          crop: {
            height: number;
            width: number;
            x: number;
            y: number;
          };
          kind: "video";
          sourceEndMs: number;
          sourceStartMs: number;
          transform: {
            rotation: number;
            scale: number;
            x: number;
            y: number;
          };
          sceneId?: string | undefined;
          speed?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          kind: "voice";
          voicePreset: string;
          sceneId?: string | undefined;
          speed?: number | undefined;
          volume?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          kind: "subtitle";
          subtitleId: string;
          styleId: string;
          text: string;
          sceneId?: string | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          fadeInMs: number;
          fadeOutMs: number;
          kind: "music";
          sourceEndMs: number;
          sourceStartMs: number;
          volume: number;
          sceneId?: string | undefined;
        })[];
        id: string;
        kind: "music" | "voice" | "video" | "subtitle";
        label: string;
      }[];
    } | import("@langchain/langgraph").OverwriteValue<{
      ai: {
        graphVersion: string;
        provider: string;
        runId: string;
        conversation?: {
          content: string;
          createdAt: string;
          role: "assistant" | "system" | "user";
          sequence: number;
          blocks?: ({
            text: string;
            type: "heading";
          } | {
            text: string;
            type: "paragraph";
          } | {
            items: string[];
            type: "bullets";
          } | {
            items: {
              key: string;
              value: string;
            }[];
            type: "key-values";
          } | {
            columns: string[];
            rows: string[][];
            type: "table";
          } | {
            items: {
              label: string;
              status: "cancelled" | "completed" | "failed" | "running" | "waiting";
              detail?: string | undefined;
            }[];
            type: "progress";
          })[] | undefined;
          nodeName?: string | undefined;
          sourceEventType?: string | undefined;
          tone?: "cancelled" | "completed" | "failed" | "running" | "waiting" | undefined;
        }[] | undefined;
      };
      assets: {
        music: {
          durationMs: number;
          id: string;
          path: string;
          title: string;
        }[];
        subtitles: {
          id: string;
          styleId: string;
          text: string;
        }[];
        thumbnails: {
          id: string;
          path: string;
          sourceVideoAssetId: string;
        }[];
        videos: {
          durationMs: number;
          fps: number;
          height: number;
          id: string;
          path: string;
          thumbnailIds: string[];
          width: number;
        }[];
        voices: {
          durationMs: number;
          id: string;
          path: string;
          provider: string;
          voice: string;
        }[];
      };
      canvas: {
        durationMs: number;
        fps: number;
        height: number;
        safeArea: {
          height: number;
          width: number;
          x: number;
          y: number;
        };
        width: number;
      };
      project: {
        createdAt: string;
        id: string;
        sourcePrompt: string;
        title: string;
        updatedAt: string;
      };
      render: {
        format: "mp4";
        quality: "preview" | "final";
      };
      scenes: {
        durationMs: number;
        goal: string;
        id: string;
        index: number;
        matchedVideoAssetIds: string[];
        notes: string;
        script: string;
        subtitleIds: string[];
        title: string;
        visualIntent: string;
        voiceAssetId: string;
      }[];
      schemaVersion: "1.0.0";
      tracks: {
        clips: ({
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          crop: {
            height: number;
            width: number;
            x: number;
            y: number;
          };
          kind: "video";
          sourceEndMs: number;
          sourceStartMs: number;
          transform: {
            rotation: number;
            scale: number;
            x: number;
            y: number;
          };
          sceneId?: string | undefined;
          speed?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          kind: "voice";
          voicePreset: string;
          sceneId?: string | undefined;
          speed?: number | undefined;
          volume?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          kind: "subtitle";
          subtitleId: string;
          styleId: string;
          text: string;
          sceneId?: string | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          fadeInMs: number;
          fadeOutMs: number;
          kind: "music";
          sourceEndMs: number;
          sourceStartMs: number;
          volume: number;
          sceneId?: string | undefined;
        })[];
        id: string;
        kind: "music" | "voice" | "video" | "subtitle";
        label: string;
      }[];
    } | undefined> | undefined, unknown>;
    (): import("@langchain/langgraph").LastValue<{
      ai: {
        graphVersion: string;
        provider: string;
        runId: string;
        conversation?: {
          content: string;
          createdAt: string;
          role: "assistant" | "system" | "user";
          sequence: number;
          blocks?: ({
            text: string;
            type: "heading";
          } | {
            text: string;
            type: "paragraph";
          } | {
            items: string[];
            type: "bullets";
          } | {
            items: {
              key: string;
              value: string;
            }[];
            type: "key-values";
          } | {
            columns: string[];
            rows: string[][];
            type: "table";
          } | {
            items: {
              label: string;
              status: "cancelled" | "completed" | "failed" | "running" | "waiting";
              detail?: string | undefined;
            }[];
            type: "progress";
          })[] | undefined;
          nodeName?: string | undefined;
          sourceEventType?: string | undefined;
          tone?: "cancelled" | "completed" | "failed" | "running" | "waiting" | undefined;
        }[] | undefined;
      };
      assets: {
        music: {
          durationMs: number;
          id: string;
          path: string;
          title: string;
        }[];
        subtitles: {
          id: string;
          styleId: string;
          text: string;
        }[];
        thumbnails: {
          id: string;
          path: string;
          sourceVideoAssetId: string;
        }[];
        videos: {
          durationMs: number;
          fps: number;
          height: number;
          id: string;
          path: string;
          thumbnailIds: string[];
          width: number;
        }[];
        voices: {
          durationMs: number;
          id: string;
          path: string;
          provider: string;
          voice: string;
        }[];
      };
      canvas: {
        durationMs: number;
        fps: number;
        height: number;
        safeArea: {
          height: number;
          width: number;
          x: number;
          y: number;
        };
        width: number;
      };
      project: {
        createdAt: string;
        id: string;
        sourcePrompt: string;
        title: string;
        updatedAt: string;
      };
      render: {
        format: "mp4";
        quality: "preview" | "final";
      };
      scenes: {
        durationMs: number;
        goal: string;
        id: string;
        index: number;
        matchedVideoAssetIds: string[];
        notes: string;
        script: string;
        subtitleIds: string[];
        title: string;
        visualIntent: string;
        voiceAssetId: string;
      }[];
      schemaVersion: "1.0.0";
      tracks: {
        clips: ({
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          crop: {
            height: number;
            width: number;
            x: number;
            y: number;
          };
          kind: "video";
          sourceEndMs: number;
          sourceStartMs: number;
          transform: {
            rotation: number;
            scale: number;
            x: number;
            y: number;
          };
          sceneId?: string | undefined;
          speed?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          kind: "voice";
          voicePreset: string;
          sceneId?: string | undefined;
          speed?: number | undefined;
          volume?: number | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          kind: "subtitle";
          subtitleId: string;
          styleId: string;
          text: string;
          sceneId?: string | undefined;
        } | {
          endMs: number;
          id: string;
          startMs: number;
          assetId: string;
          fadeInMs: number;
          fadeOutMs: number;
          kind: "music";
          sourceEndMs: number;
          sourceStartMs: number;
          volume: number;
          sceneId?: string | undefined;
        })[];
        id: string;
        kind: "music" | "voice" | "video" | "subtitle";
        label: string;
      }[];
    } | undefined>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  runId: {
    (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    (): import("@langchain/langgraph").LastValue<string>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  savedProjectPath: {
    (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    (): import("@langchain/langgraph").LastValue<string | undefined>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  scenes: {
    (annotation: import("@langchain/langgraph").SingleReducer<{
      durationMs: number;
      goal: string;
      id: string;
      index: number;
      script: string;
      subtitleLines: string[];
      title: string;
      visualIntent: string;
    }[], {
      durationMs: number;
      goal: string;
      id: string;
      index: number;
      script: string;
      subtitleLines: string[];
      title: string;
      visualIntent: string;
    }[]>): import("@langchain/langgraph").BaseChannel<{
      durationMs: number;
      goal: string;
      id: string;
      index: number;
      script: string;
      subtitleLines: string[];
      title: string;
      visualIntent: string;
    }[], {
      durationMs: number;
      goal: string;
      id: string;
      index: number;
      script: string;
      subtitleLines: string[];
      title: string;
      visualIntent: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
      durationMs: number;
      goal: string;
      id: string;
      index: number;
      script: string;
      subtitleLines: string[];
      title: string;
      visualIntent: string;
    }[]>, unknown>;
    (): import("@langchain/langgraph").LastValue<{
      durationMs: number;
      goal: string;
      id: string;
      index: number;
      script: string;
      subtitleLines: string[];
      title: string;
      visualIntent: string;
    }[]>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
  voices: {
    (annotation: import("@langchain/langgraph").SingleReducer<VoiceSynthesisResult[], VoiceSynthesisResult[]>): import("@langchain/langgraph").BaseChannel<VoiceSynthesisResult[], VoiceSynthesisResult[] | import("@langchain/langgraph").OverwriteValue<VoiceSynthesisResult[]>, unknown>;
    (): import("@langchain/langgraph").LastValue<VoiceSynthesisResult[]>;
    Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
  };
}>;
type VideoCreationGraphState = typeof VideoCreationStateAnnotation.State;
//#endregion
//#region src/graph/create-video-creation-graph.d.ts
type VideoCreationGraphResult = {
  approval?: SceneApprovalRequest;
  errors: string[];
  project?: VideoProject;
  runId: string;
  savedProjectPath?: string;
  state?: Partial<VideoCreationGraphState>;
  status: 'completed' | 'failed' | 'waiting_for_approval';
};
type VideoCreationGraphRunner = {
  resume: (input: {
    approval: SceneApprovalResume;
    runId: string;
  }) => Promise<VideoCreationGraphResult>;
  start: (input: VideoCreationInput) => Promise<VideoCreationGraphResult>;
};
declare const createVideoCreationGraph: ({
  checkpointer,
  emit,
  tools
}: {
  checkpointer?: BaseCheckpointSaver;
  emit?: (event: AgentRunEvent) => void;
  tools: VideoAgentTools;
}) => VideoCreationGraphRunner;
//#endregion
//#region src/media/extract-keyframes.d.ts
type ExtractedKeyframe = {
  index: number;
  path: string;
  timestampMs: number;
};
declare const extractKeyframes: ({
  ffmpegPath,
  filePath,
  frameCount,
  outputDirectory
}: {
  ffmpegPath: string;
  filePath: string;
  frameCount: number;
  outputDirectory: string;
}) => Promise<ExtractedKeyframe[]>;
//#endregion
//#region src/media/probe-media.d.ts
type MediaMetadata = {
  codecName: string;
  durationMs: number;
  filePath: string;
  fps: number;
  height: number;
  width: number;
};
declare const probeMedia: ({
  ffprobePath,
  filePath
}: {
  ffprobePath: string;
  filePath: string;
}) => Promise<MediaMetadata>;
//#endregion
//#region src/providers/ark-chat-model-provider.d.ts
type ModelProviderTask = 'assetMatcher' | 'creativeBrief' | 'frameDescription' | 'scenePlanner' | 'textEmbedding';
type ArkProviderEvent = {
  baseURL: string;
  model: string;
  provider: 'ark';
  type: 'provider.configured';
};
type StructuredChatModel = {
  stream?: (prompt: string) => AsyncIterable<unknown> | Promise<AsyncIterable<unknown>>;
  withStructuredOutput: <T>(schema: ZodType<T>, config: StructuredOutputOptions) => {
    invoke: (prompt: string) => Promise<unknown>;
  };
};
type StructuredOutputMethod = 'functionCalling' | 'jsonMode' | 'jsonSchema';
type StructuredOutputOptions = {
  method: StructuredOutputMethod;
  strict?: boolean;
};
type ArkChatModelOptions = {
  apiKey: string;
  configuration: {
    baseURL: string;
  };
  maxRetries?: number;
  model: string;
  streamUsage: false;
  timeout?: number;
};
declare class ModelProviderSchemaError extends Error {
  readonly issues: Pick<ZodIssue, 'message' | 'path'>[];
  readonly task: ModelProviderTask;
  constructor({
    issues,
    task
  }: {
    issues: Pick<ZodIssue, 'message' | 'path'>[];
    task: ModelProviderTask;
  });
}
declare class ArkChatModelProvider implements ModelProvider {
  readonly providerName = "ark";
  private readonly model;
  private readonly structuredOutput;
  constructor({
    createModel,
    emit,
    env,
    maxRetries,
    model,
    structuredOutput,
    timeout
  }: {
    createModel?: (options: ArkChatModelOptions) => StructuredChatModel;
    emit?: (event: ArkProviderEvent) => void;
    env: AgentEnv;
    maxRetries?: number;
    model?: StructuredChatModel;
    structuredOutput?: Partial<StructuredOutputOptions>;
    timeout?: number;
  });
  generateCreativeBrief(input: CreativeBriefInput): Promise<CreativeBrief>;
  planScenes(input: ScenePlanInput): Promise<PlannedScene[]>;
  describeFrames({
    frames
  }: {
    frames: FrameDescriptionInput[];
  }): Promise<FrameDescription[]>;
  rankAssetMatches({
    candidates,
    scenes
  }: {
    candidates: AssetMatchCandidate[];
    scenes: PlannedScene[];
  }): Promise<AssetMatchRanking[]>;
  embedTexts({
    texts
  }: {
    texts: string[];
  }): Promise<TextEmbedding[]>;
  streamReport(input: ModelReportInput, emitDelta: (delta: string) => void | Promise<void>): Promise<string>;
  private invokeStructured;
}
//#endregion
//#region src/providers/tts-provider.d.ts
type TtsProviderEvent = {
  textLength: number;
  type: 'tts.started';
  voice: string;
} | {
  byteLength: number;
  type: 'tts.chunk';
} | {
  byteLength: number;
  durationMs: number;
  outputPath: string;
  type: 'tts.completed';
} | {
  error: string;
  type: 'tts.failed';
};
type TtsSynthesisInput = {
  emit?: (event: TtsProviderEvent) => void;
  outputPath: string;
  speedRatio?: number;
  text: string;
  voice: string;
  volumeRatio?: number;
};
type TtsSynthesisResult = {
  byteLength: number;
  durationMs: number;
  format: 'mp3' | 'wav';
  path: string;
};
type TtsProvider = {
  synthesizeSpeech: (input: TtsSynthesisInput) => Promise<TtsSynthesisResult>;
};
//#endregion
//#region src/providers/index-tts2-provider.d.ts
type FetchInit = {
  body?: FormData | string;
  headers?: Record<string, string>;
  method?: string;
};
type Fetch = (url: string, init?: FetchInit) => Promise<Response>;
type ProbeDuration$1 = typeof probeAudioDuration;
type IndexTts2ProviderOptions = {
  fetch?: Fetch;
  ffprobePath?: string;
  maxTextTokensPerSegment?: number;
  probeDuration?: ProbeDuration$1;
  resolveVoiceReferencePath: (voiceId: string) => Promise<string> | string;
  serverUrl?: string;
};
declare class IndexTts2ProviderError extends Error {
  constructor(message: string);
}
declare const createCustomIndexTts2VoiceType: (voiceId: string) => string;
declare const parseCustomIndexTts2VoiceId: (voice: string) => string | undefined;
declare class IndexTts2Provider implements TtsProvider {
  private readonly fetch;
  private readonly ffprobePath;
  private readonly maxTextTokensPerSegment;
  private readonly probeDuration;
  private readonly resolveVoiceReferencePath;
  private readonly serverUrl;
  constructor({
    fetch,
    ffprobePath,
    maxTextTokensPerSegment,
    probeDuration,
    resolveVoiceReferencePath,
    serverUrl
  }: IndexTts2ProviderOptions);
  synthesizeSpeech({
    emit,
    outputPath,
    text,
    voice
  }: TtsSynthesisInput): Promise<TtsSynthesisResult>;
}
declare class RoutingTtsProvider implements TtsProvider {
  private readonly providers;
  constructor(providers: {
    customProvider: TtsProvider;
    defaultProvider: TtsProvider;
  });
  synthesizeSpeech(input: TtsSynthesisInput): Promise<TtsSynthesisResult>;
}
//#endregion
//#region src/providers/tts-protocol/types.d.ts
declare enum MsgType {
  FullClientRequest = 1,
  FullServerResponse = 9,
  AudioOnlyServer = 11,
  Error = 15
}
declare enum MsgTypeFlag {
  NoSeq = 0,
  WithEvent = 4
}
declare enum SerializationType {
  None = 0,
  Json = 1
}
declare enum CompressionType {
  None = 0
}
declare enum EventType {
  StartConnection = 1,
  FinishConnection = 2,
  ConnectionStarted = 50,
  ConnectionFailed = 51,
  ConnectionFinished = 52,
  StartSession = 100,
  CancelSession = 101,
  FinishSession = 102,
  SessionStarted = 150,
  SessionCanceled = 151,
  SessionFinished = 152,
  SessionFailed = 153,
  TaskRequest = 200,
  TtsSentenceStart = 350,
  TtsSentenceEnd = 351,
  TtsResponse = 352
}
type TtsProtocolMessage = {
  errorCode?: number;
  event?: EventType;
  msgType: MsgType;
  payload: Uint8Array;
  sessionId?: string;
};
type TtsProtocolSocket = {
  close: () => Promise<void> | void;
  receive: () => Promise<ArrayBuffer | ArrayBufferView | string>;
  send: (data: Uint8Array) => Promise<void> | void;
};
//#endregion
//#region src/providers/tts-protocol/frame.d.ts
declare const createTtsMessageFrame: ({
  errorCode,
  event,
  msgType,
  payload,
  sessionId
}: TtsProtocolMessage) => Uint8Array;
declare const parseTtsMessageFrame: (input: ArrayBuffer | ArrayBufferView | string) => TtsProtocolMessage;
//#endregion
//#region src/providers/tts-protocol/full-client-request.d.ts
declare const fullClientRequest: (socket: TtsProtocolSocket, payload: Uint8Array, {
  sessionId
}?: {
  sessionId?: string;
}) => Promise<void>;
//#endregion
//#region src/providers/tts-protocol/receive-message.d.ts
declare const receiveMessage: (socket: TtsProtocolSocket) => Promise<TtsProtocolMessage>;
//#endregion
//#region src/providers/volcengine-tts-provider.d.ts
type SocketFactoryInput = {
  endpoint: string;
  headers: Record<string, string>;
};
type SocketFactory = (input: SocketFactoryInput) => Promise<TtsProtocolSocket>;
type ProbeDuration = typeof probeAudioDuration;
type VolcengineTtsProviderOptions = {
  connect?: SocketFactory;
  endpoint?: string;
  env: Pick<AgentEnv, 'API_KEY' | 'TTS_MODEL'>;
  ffprobePath?: string;
  format?: 'mp3';
  probeDuration?: ProbeDuration;
  sampleRate?: number;
};
declare class VolcengineTtsProviderError extends Error {
  readonly options: {
    errorCode?: number;
  };
  constructor(message: string, options?: {
    errorCode?: number;
  });
}
declare const createWsTtsProtocolSocket: SocketFactory;
declare class VolcengineTtsProvider implements TtsProvider {
  private readonly connect;
  private readonly endpoint;
  private readonly env;
  private readonly ffprobePath;
  private readonly format;
  private readonly probeDuration;
  private readonly sampleRate;
  constructor({
    connect,
    endpoint,
    env,
    ffprobePath,
    format,
    probeDuration,
    sampleRate
  }: VolcengineTtsProviderOptions);
  synthesizeSpeech({
    emit,
    outputPath,
    speedRatio,
    text,
    voice,
    volumeRatio
  }: TtsSynthesisInput): Promise<TtsSynthesisResult>;
}
//#endregion
//#region src/storage/create-agent-database.d.ts
type AgentDatabase = {
  close: () => void;
  database: DatabaseSync;
};
declare const createAgentDatabase: ({
  filename
}: {
  filename: string;
}) => AgentDatabase;
//#endregion
//#region src/storage/schema.sql.d.ts
declare const agentDatabaseSchemaStatements: readonly ["create table if not exists projects (\n        id text primary key,\n        title text not null,\n        project_path text not null,\n        created_at text not null,\n        updated_at text not null\n    )", "create table if not exists agent_runs (\n        id text primary key,\n        project_id text not null,\n        status text not null,\n        started_at text not null,\n        completed_at text,\n        error_message text,\n        foreign key (project_id) references projects(id)\n    )", "create table if not exists asset_segments (\n        id text primary key,\n        project_id text not null,\n        asset_id text not null,\n        media_type text not null,\n        source_path text not null,\n        start_ms integer not null,\n        end_ms integer not null,\n        description text,\n        metadata_json text not null,\n        foreign key (project_id) references projects(id)\n    )", "create table if not exists asset_embeddings (\n        id text primary key,\n        segment_id text not null,\n        model text not null,\n        embedding_json text not null,\n        created_at text not null,\n        foreign key (segment_id) references asset_segments(id)\n    )", "create table if not exists graph_checkpoints (\n        id text primary key,\n        run_id text not null,\n        checkpoint_json text not null,\n        created_at text not null,\n        foreign key (run_id) references agent_runs(id)\n    )", "create table if not exists ai_decisions (\n        id text primary key,\n        run_id text not null,\n        node_name text not null,\n        decision_json text not null,\n        created_at text not null,\n        foreign key (run_id) references agent_runs(id)\n    )"];
//#endregion
export { type AgentDatabase, type AgentEnv, type AgentEnvIssue, AgentEnvValidationError, type AgentRunEvent, type AgentRunEventBase, type ArkChatModelOptions, ArkChatModelProvider, type ArkProviderEvent, type AssetAnalysis, type AssetMatchCandidate, AssetMatchCandidateSchema, type AssetMatchRanking, AssetMatchResponseSchema, type AssetMatchResult, AssetMatchSchema, CompressionType, type CreativeBrief, type CreativeBriefInput, CreativeBriefSchema, EventType, type ExtractedKeyframe, type FrameDescription, type FrameDescriptionInput, FrameDescriptionInputSchema, FrameDescriptionResponseSchema, FrameDescriptionSchema, IndexTts2Provider, IndexTts2ProviderError, type MediaMetadata, type ModelProvider, ModelProviderSchemaError, type ModelReportInput, MsgType, MsgTypeFlag, type PlannedScene, PlannedSceneSchema, type ProjectValidationResult, RankedAssetSchema, RoutingTtsProvider, type SavedVideoProject, type SceneApprovalRequest, type SceneApprovalResume, type ScenePlanInput, ScenePlanResponseSchema, SerializationType, type StructuredChatModel, type StructuredOutputMethod, type StructuredOutputOptions, type TextEmbedding, type TtsProtocolMessage, type TtsProtocolSocket, type TtsProvider, type TtsProviderEvent, type TtsSynthesisInput, type TtsSynthesisResult, type VideoAgentTools, type VideoCreationGraphResult, type VideoCreationGraphRunner, type VideoCreationGraphState, type VideoCreationInput, VideoCreationStateAnnotation, type VoiceSynthesisResult, VolcengineTtsProvider, VolcengineTtsProviderError, agentDatabaseSchemaStatements, buildAssetMatcherPrompt, buildCreativeBriefPrompt, buildFrameDescriptionPrompt, buildScenePlannerPrompt, createAgentDatabase, createCustomIndexTts2VoiceType, createSequencedEventEmitter, createTtsMessageFrame, createVideoCreationGraph, createWsTtsProtocolSocket, extractKeyframes, fullClientRequest, loadAgentEnv, parseCustomIndexTts2VoiceId, parseTtsMessageFrame, probeAudioDuration, probeMedia, receiveMessage, redactSecrets, serializeError };