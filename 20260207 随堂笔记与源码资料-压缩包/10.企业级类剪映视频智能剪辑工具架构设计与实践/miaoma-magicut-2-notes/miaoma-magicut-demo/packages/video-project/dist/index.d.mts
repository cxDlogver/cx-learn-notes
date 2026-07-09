import { z } from "zod";

//#region src/fixtures/sample-project.d.ts
declare const sampleVideoProject: {
  ai: {
    graphVersion: string;
    provider: string;
    runId: string;
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
    quality: "preview";
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
  tracks: ({
    clips: {
      assetId: string;
      crop: {
        height: number;
        width: number;
        x: number;
        y: number;
      };
      endMs: number;
      id: string;
      kind: "video";
      sceneId: string;
      sourceEndMs: number;
      sourceStartMs: number;
      startMs: number;
      transform: {
        rotation: number;
        scale: number;
        x: number;
        y: number;
      };
    }[];
    id: string;
    kind: "video";
    label: string;
  } | {
    clips: {
      assetId: string;
      endMs: number;
      id: string;
      kind: "voice";
      sceneId: string;
      startMs: number;
      voicePreset: string;
    }[];
    id: string;
    kind: "voice";
    label: string;
  } | {
    clips: {
      endMs: number;
      id: string;
      kind: "subtitle";
      sceneId: string;
      startMs: number;
      styleId: string;
      subtitleId: string;
      text: string;
    }[];
    id: string;
    kind: "subtitle";
    label: string;
  } | {
    clips: {
      assetId: string;
      endMs: number;
      fadeInMs: number;
      fadeOutMs: number;
      id: string;
      kind: "music";
      sourceEndMs: number;
      sourceStartMs: number;
      startMs: number;
      volume: number;
    }[];
    id: string;
    kind: "music";
    label: string;
  })[];
};
//#endregion
//#region src/schema.d.ts
declare const VideoClipSchema: z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  assetId: z.ZodString;
  crop: z.ZodObject<{
    height: z.ZodNumber;
    width: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
  }, z.core.$strip>;
  kind: z.ZodLiteral<"video">;
  sourceEndMs: z.ZodNumber;
  sourceStartMs: z.ZodNumber;
  transform: z.ZodObject<{
    rotation: z.ZodNumber;
    scale: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
  }, z.core.$strip>;
}, z.core.$strip>;
declare const VoiceClipSchema: z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  assetId: z.ZodString;
  kind: z.ZodLiteral<"voice">;
  voicePreset: z.ZodString;
}, z.core.$strip>;
declare const SubtitleClipSchema: z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  kind: z.ZodLiteral<"subtitle">;
  subtitleId: z.ZodString;
  styleId: z.ZodString;
  text: z.ZodString;
}, z.core.$strip>;
declare const MusicClipSchema: z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  assetId: z.ZodString;
  fadeInMs: z.ZodNumber;
  fadeOutMs: z.ZodNumber;
  kind: z.ZodLiteral<"music">;
  sourceEndMs: z.ZodNumber;
  sourceStartMs: z.ZodNumber;
  volume: z.ZodNumber;
}, z.core.$strip>;
declare const TimelineClipSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  assetId: z.ZodString;
  crop: z.ZodObject<{
    height: z.ZodNumber;
    width: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
  }, z.core.$strip>;
  kind: z.ZodLiteral<"video">;
  sourceEndMs: z.ZodNumber;
  sourceStartMs: z.ZodNumber;
  transform: z.ZodObject<{
    rotation: z.ZodNumber;
    scale: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
  }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  assetId: z.ZodString;
  kind: z.ZodLiteral<"voice">;
  voicePreset: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  kind: z.ZodLiteral<"subtitle">;
  subtitleId: z.ZodString;
  styleId: z.ZodString;
  text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
  endMs: z.ZodNumber;
  id: z.ZodString;
  sceneId: z.ZodOptional<z.ZodString>;
  startMs: z.ZodNumber;
  assetId: z.ZodString;
  fadeInMs: z.ZodNumber;
  fadeOutMs: z.ZodNumber;
  kind: z.ZodLiteral<"music">;
  sourceEndMs: z.ZodNumber;
  sourceStartMs: z.ZodNumber;
  volume: z.ZodNumber;
}, z.core.$strip>], "kind">;
declare const TimelineTrackKindSchema: z.ZodEnum<{
  music: "music";
  voice: "voice";
  video: "video";
  subtitle: "subtitle";
}>;
declare const TimelineTrackSchema: z.ZodObject<{
  clips: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
    endMs: z.ZodNumber;
    id: z.ZodString;
    sceneId: z.ZodOptional<z.ZodString>;
    startMs: z.ZodNumber;
    assetId: z.ZodString;
    crop: z.ZodObject<{
      height: z.ZodNumber;
      width: z.ZodNumber;
      x: z.ZodNumber;
      y: z.ZodNumber;
    }, z.core.$strip>;
    kind: z.ZodLiteral<"video">;
    sourceEndMs: z.ZodNumber;
    sourceStartMs: z.ZodNumber;
    transform: z.ZodObject<{
      rotation: z.ZodNumber;
      scale: z.ZodNumber;
      x: z.ZodNumber;
      y: z.ZodNumber;
    }, z.core.$strip>;
  }, z.core.$strip>, z.ZodObject<{
    endMs: z.ZodNumber;
    id: z.ZodString;
    sceneId: z.ZodOptional<z.ZodString>;
    startMs: z.ZodNumber;
    assetId: z.ZodString;
    kind: z.ZodLiteral<"voice">;
    voicePreset: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    endMs: z.ZodNumber;
    id: z.ZodString;
    sceneId: z.ZodOptional<z.ZodString>;
    startMs: z.ZodNumber;
    kind: z.ZodLiteral<"subtitle">;
    subtitleId: z.ZodString;
    styleId: z.ZodString;
    text: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    endMs: z.ZodNumber;
    id: z.ZodString;
    sceneId: z.ZodOptional<z.ZodString>;
    startMs: z.ZodNumber;
    assetId: z.ZodString;
    fadeInMs: z.ZodNumber;
    fadeOutMs: z.ZodNumber;
    kind: z.ZodLiteral<"music">;
    sourceEndMs: z.ZodNumber;
    sourceStartMs: z.ZodNumber;
    volume: z.ZodNumber;
  }, z.core.$strip>], "kind">>;
  id: z.ZodString;
  kind: z.ZodEnum<{
    music: "music";
    voice: "voice";
    video: "video";
    subtitle: "subtitle";
  }>;
  label: z.ZodString;
}, z.core.$strip>;
declare const ProjectAssetsSchema: z.ZodObject<{
  music: z.ZodArray<z.ZodObject<{
    durationMs: z.ZodNumber;
    id: z.ZodString;
    path: z.ZodString;
    title: z.ZodString;
  }, z.core.$strip>>;
  subtitles: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    styleId: z.ZodString;
    text: z.ZodString;
  }, z.core.$strip>>;
  thumbnails: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    path: z.ZodString;
    sourceVideoAssetId: z.ZodString;
  }, z.core.$strip>>;
  videos: z.ZodArray<z.ZodObject<{
    durationMs: z.ZodNumber;
    fps: z.ZodNumber;
    height: z.ZodNumber;
    id: z.ZodString;
    path: z.ZodString;
    thumbnailIds: z.ZodArray<z.ZodString>;
    width: z.ZodNumber;
  }, z.core.$strip>>;
  voices: z.ZodArray<z.ZodObject<{
    durationMs: z.ZodNumber;
    id: z.ZodString;
    path: z.ZodString;
    provider: z.ZodString;
    voice: z.ZodString;
  }, z.core.$strip>>;
}, z.core.$strip>;
declare const SceneSchema: z.ZodObject<{
  durationMs: z.ZodNumber;
  goal: z.ZodString;
  id: z.ZodString;
  index: z.ZodNumber;
  matchedVideoAssetIds: z.ZodArray<z.ZodString>;
  notes: z.ZodString;
  script: z.ZodString;
  subtitleIds: z.ZodArray<z.ZodString>;
  title: z.ZodString;
  visualIntent: z.ZodString;
  voiceAssetId: z.ZodString;
}, z.core.$strip>;
declare const CanvasConfigSchema: z.ZodObject<{
  durationMs: z.ZodNumber;
  fps: z.ZodNumber;
  height: z.ZodNumber;
  safeArea: z.ZodObject<{
    height: z.ZodNumber;
    width: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
  }, z.core.$strip>;
  width: z.ZodNumber;
}, z.core.$strip>;
declare const ProjectMetadataSchema: z.ZodObject<{
  createdAt: z.ZodString;
  id: z.ZodString;
  sourcePrompt: z.ZodString;
  title: z.ZodString;
  updatedAt: z.ZodString;
}, z.core.$strip>;
declare const RenderConfigSchema: z.ZodObject<{
  format: z.ZodEnum<{
    mp4: "mp4";
  }>;
  quality: z.ZodEnum<{
    preview: "preview";
    final: "final";
  }>;
}, z.core.$strip>;
declare const AiRunMetadataSchema: z.ZodObject<{
  graphVersion: z.ZodString;
  provider: z.ZodString;
  runId: z.ZodString;
}, z.core.$strip>;
declare const VideoProjectSchema: z.ZodObject<{
  ai: z.ZodObject<{
    graphVersion: z.ZodString;
    provider: z.ZodString;
    runId: z.ZodString;
  }, z.core.$strip>;
  assets: z.ZodObject<{
    music: z.ZodArray<z.ZodObject<{
      durationMs: z.ZodNumber;
      id: z.ZodString;
      path: z.ZodString;
      title: z.ZodString;
    }, z.core.$strip>>;
    subtitles: z.ZodArray<z.ZodObject<{
      id: z.ZodString;
      styleId: z.ZodString;
      text: z.ZodString;
    }, z.core.$strip>>;
    thumbnails: z.ZodArray<z.ZodObject<{
      id: z.ZodString;
      path: z.ZodString;
      sourceVideoAssetId: z.ZodString;
    }, z.core.$strip>>;
    videos: z.ZodArray<z.ZodObject<{
      durationMs: z.ZodNumber;
      fps: z.ZodNumber;
      height: z.ZodNumber;
      id: z.ZodString;
      path: z.ZodString;
      thumbnailIds: z.ZodArray<z.ZodString>;
      width: z.ZodNumber;
    }, z.core.$strip>>;
    voices: z.ZodArray<z.ZodObject<{
      durationMs: z.ZodNumber;
      id: z.ZodString;
      path: z.ZodString;
      provider: z.ZodString;
      voice: z.ZodString;
    }, z.core.$strip>>;
  }, z.core.$strip>;
  canvas: z.ZodObject<{
    durationMs: z.ZodNumber;
    fps: z.ZodNumber;
    height: z.ZodNumber;
    safeArea: z.ZodObject<{
      height: z.ZodNumber;
      width: z.ZodNumber;
      x: z.ZodNumber;
      y: z.ZodNumber;
    }, z.core.$strip>;
    width: z.ZodNumber;
  }, z.core.$strip>;
  project: z.ZodObject<{
    createdAt: z.ZodString;
    id: z.ZodString;
    sourcePrompt: z.ZodString;
    title: z.ZodString;
    updatedAt: z.ZodString;
  }, z.core.$strip>;
  render: z.ZodObject<{
    format: z.ZodEnum<{
      mp4: "mp4";
    }>;
    quality: z.ZodEnum<{
      preview: "preview";
      final: "final";
    }>;
  }, z.core.$strip>;
  scenes: z.ZodArray<z.ZodObject<{
    durationMs: z.ZodNumber;
    goal: z.ZodString;
    id: z.ZodString;
    index: z.ZodNumber;
    matchedVideoAssetIds: z.ZodArray<z.ZodString>;
    notes: z.ZodString;
    script: z.ZodString;
    subtitleIds: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    visualIntent: z.ZodString;
    voiceAssetId: z.ZodString;
  }, z.core.$strip>>;
  schemaVersion: z.ZodLiteral<"1.0.0">;
  tracks: z.ZodArray<z.ZodObject<{
    clips: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
      endMs: z.ZodNumber;
      id: z.ZodString;
      sceneId: z.ZodOptional<z.ZodString>;
      startMs: z.ZodNumber;
      assetId: z.ZodString;
      crop: z.ZodObject<{
        height: z.ZodNumber;
        width: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
      }, z.core.$strip>;
      kind: z.ZodLiteral<"video">;
      sourceEndMs: z.ZodNumber;
      sourceStartMs: z.ZodNumber;
      transform: z.ZodObject<{
        rotation: z.ZodNumber;
        scale: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
      }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
      endMs: z.ZodNumber;
      id: z.ZodString;
      sceneId: z.ZodOptional<z.ZodString>;
      startMs: z.ZodNumber;
      assetId: z.ZodString;
      kind: z.ZodLiteral<"voice">;
      voicePreset: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      endMs: z.ZodNumber;
      id: z.ZodString;
      sceneId: z.ZodOptional<z.ZodString>;
      startMs: z.ZodNumber;
      kind: z.ZodLiteral<"subtitle">;
      subtitleId: z.ZodString;
      styleId: z.ZodString;
      text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      endMs: z.ZodNumber;
      id: z.ZodString;
      sceneId: z.ZodOptional<z.ZodString>;
      startMs: z.ZodNumber;
      assetId: z.ZodString;
      fadeInMs: z.ZodNumber;
      fadeOutMs: z.ZodNumber;
      kind: z.ZodLiteral<"music">;
      sourceEndMs: z.ZodNumber;
      sourceStartMs: z.ZodNumber;
      volume: z.ZodNumber;
    }, z.core.$strip>], "kind">>;
    id: z.ZodString;
    kind: z.ZodEnum<{
      music: "music";
      voice: "voice";
      video: "video";
      subtitle: "subtitle";
    }>;
    label: z.ZodString;
  }, z.core.$strip>>;
}, z.core.$strip>;
//#endregion
//#region src/types.d.ts
type VideoProject = z.infer<typeof VideoProjectSchema>;
type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
type CanvasConfig = z.infer<typeof CanvasConfigSchema>;
type ProjectAssets = z.infer<typeof ProjectAssetsSchema>;
type Scene = z.infer<typeof SceneSchema>;
type TimelineTrackKind = z.infer<typeof TimelineTrackKindSchema>;
type TimelineTrack = z.infer<typeof TimelineTrackSchema>;
type TimelineClip = z.infer<typeof TimelineClipSchema>;
type VideoClip = z.infer<typeof VideoClipSchema>;
type VoiceClip = z.infer<typeof VoiceClipSchema>;
type SubtitleClip = z.infer<typeof SubtitleClipSchema>;
type MusicClip = z.infer<typeof MusicClipSchema>;
type RenderConfig = z.infer<typeof RenderConfigSchema>;
type AiRunMetadata = z.infer<typeof AiRunMetadataSchema>;
type VideoProjectValidationResult = {
  data: VideoProject;
  success: true;
} | {
  issues: string[];
  success: false;
};
//#endregion
//#region src/validation.d.ts
declare class VideoProjectValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]);
}
declare const validateVideoProject: (value: unknown) => VideoProjectValidationResult;
declare const assertVideoProject: (value: unknown) => {
  ai: {
    graphVersion: string;
    provider: string;
    runId: string;
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
    } | {
      endMs: number;
      id: string;
      startMs: number;
      assetId: string;
      kind: "voice";
      voicePreset: string;
      sceneId?: string | undefined;
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
};
//#endregion
export { type AiRunMetadata, AiRunMetadataSchema, type CanvasConfig, CanvasConfigSchema, type MusicClip, MusicClipSchema, type ProjectAssets, ProjectAssetsSchema, type ProjectMetadata, ProjectMetadataSchema, type RenderConfig, RenderConfigSchema, type Scene, SceneSchema, type SubtitleClip, SubtitleClipSchema, type TimelineClip, TimelineClipSchema, type TimelineTrack, type TimelineTrackKind, TimelineTrackKindSchema, TimelineTrackSchema, type VideoClip, VideoClipSchema, type VideoProject, VideoProjectSchema, VideoProjectValidationError, type VideoProjectValidationResult, type VoiceClip, VoiceClipSchema, assertVideoProject, sampleVideoProject, validateVideoProject };