import { z } from 'zod';

const idSchema = z.string().min(1);
const secondsSchema = z.number().finite().nonnegative();
const positiveSecondsSchema = z.number().finite().positive();

export const mediaTypeSchema = z.enum(['video', 'audio', 'image']);
export const trackTypeSchema = z.enum([
    'video',
    'audio',
    'image',
    'text',
    'subtitle',
    'voiceover'
]);

export const assetSchema = z.object({
    id: idSchema,
    path: z.string().min(1),
    mediaType: mediaTypeSchema,
    duration: secondsSchema.optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    fps: z.number().finite().positive().optional(),
    sampleRate: z.number().int().positive().optional(),
    hash: z.string().min(1).optional(),
    proxyPath: z.string().min(1).optional(),
    thumbnailPath: z.string().min(1).optional(),
    waveformPath: z.string().min(1).optional()
});

export const trackSchema = z.object({
    id: idSchema,
    type: trackTypeSchema,
    name: z.string().min(1),
    locked: z.boolean(),
    muted: z.boolean(),
    visible: z.boolean(),
    order: z.number().int().nonnegative()
});

export const clipTransformSchema = z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    scale: z.number().finite().positive(),
    rotation: z.number().finite(),
    opacity: z.number().finite().min(0).max(1)
});

export const clipSchema = z
    .object({
        id: idSchema,
        assetId: idSchema,
        trackId: idSchema,
        start: secondsSchema,
        duration: positiveSecondsSchema,
        sourceIn: secondsSchema,
        sourceOut: positiveSecondsSchema,
        volume: z.number().finite().min(0).max(4),
        speed: z.number().finite().positive(),
        fadeIn: secondsSchema.optional(),
        fadeOut: secondsSchema.optional(),
        transform: clipTransformSchema
    })
    .refine((clip) => clip.sourceOut > clip.sourceIn, {
        message: 'sourceOut must be greater than sourceIn',
        path: ['sourceOut']
    });

export const subtitleCueSchema = z.object({
    id: idSchema,
    start: secondsSchema,
    duration: positiveSecondsSchema,
    text: z.string().min(1)
});

export const aiSegmentSchema = z.object({
    id: idSchema,
    scriptText: z.string().min(1),
    transcriptText: z.string().optional(),
    ttsAudioPath: z.string().min(1).optional(),
    subtitleIds: z.array(idSchema),
    recommendedAssetIds: z.array(idSchema),
    boundClipIds: z.array(idSchema)
});

export const exportSettingsSchema = z.object({
    format: z.literal('mp4'),
    codec: z.literal('h264'),
    audioCodec: z.literal('aac'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().finite().positive(),
    sampleRate: z.literal(48000)
});

export const projectDocumentSchema = z
    .object({
        schemaVersion: z.literal(1),
        projectId: idSchema,
        name: z.string().min(1),
        canvas: z.object({
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            fps: z.number().finite().positive()
        }),
        assets: z.array(assetSchema),
        tracks: z.array(trackSchema),
        clips: z.array(clipSchema),
        subtitles: z.array(subtitleCueSchema),
        aiSegments: z.array(aiSegmentSchema),
        exportSettings: exportSettingsSchema,
        updatedAt: z.string().datetime()
    })
    .superRefine((document, context) => {
        const assetIds = new Set(document.assets.map((asset) => asset.id));
        const trackIds = new Set(document.tracks.map((track) => track.id));
        const clipIds = new Set(document.clips.map((clip) => clip.id));

        if (assetIds.size !== document.assets.length) {
            context.addIssue({
                code: 'custom',
                message: 'asset ids must be unique',
                path: ['assets']
            });
        }

        if (trackIds.size !== document.tracks.length) {
            context.addIssue({
                code: 'custom',
                message: 'track ids must be unique',
                path: ['tracks']
            });
        }

        if (clipIds.size !== document.clips.length) {
            context.addIssue({
                code: 'custom',
                message: 'clip ids must be unique',
                path: ['clips']
            });
        }

        document.clips.forEach((clip, index) => {
            if (!assetIds.has(clip.assetId)) {
                context.addIssue({
                    code: 'custom',
                    message: `clip references missing asset: ${clip.assetId}`,
                    path: ['clips', index, 'assetId']
                });
            }

            if (!trackIds.has(clip.trackId)) {
                context.addIssue({
                    code: 'custom',
                    message: `clip references missing track: ${clip.trackId}`,
                    path: ['clips', index, 'trackId']
                });
            }
        });
    });

export type Asset = z.infer<typeof assetSchema>;
export type Track = z.infer<typeof trackSchema>;
export type Clip = z.infer<typeof clipSchema>;
export type SubtitleCue = z.infer<typeof subtitleCueSchema>;
export type AiSegment = z.infer<typeof aiSegmentSchema>;
export type ProjectDocument = z.infer<typeof projectDocumentSchema>;
