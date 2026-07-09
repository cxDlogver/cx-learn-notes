import { z } from 'zod';

import { createResultSchema, type Result } from './result';
import { assetSchema, projectDocumentSchema } from './project-document';

export const IPC_INVOKE_CHANNELS = [
    'project.open',
    'project.save',
    'media.import',
    'media.probe',
    'media.generateThumbs',
    'media.generateWaveform',
    'media.createProxy',
    'timeline.applyPatch',
    'render.start',
    'render.cancel',
    'ai.transcribe',
    'ai.tts',
    'ai.segmentScript',
    'ai.planStoryboard',
    'ai.matchAssets'
] as const;

export const IPC_EVENT_CHANNELS = ['render.onProgress'] as const;

export type IpcInvokeChannel = (typeof IPC_INVOKE_CHANNELS)[number];
export type IpcEventChannel = (typeof IPC_EVENT_CHANNELS)[number];

export const isIpcInvokeChannel = (
    channel: string
): channel is IpcInvokeChannel =>
    (IPC_INVOKE_CHANNELS as readonly string[]).includes(channel);

export const isIpcEventChannel = (
    channel: string
): channel is IpcEventChannel =>
    (IPC_EVENT_CHANNELS as readonly string[]).includes(channel);

export const jobStatusSchema = z.enum([
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
]);

export const jobKindSchema = z.enum([
    'render',
    'transcribe',
    'tts',
    'storyboard',
    'asset-match'
]);

export const jobDescriptorSchema = z.object({
    jobId: z.string().min(1),
    kind: jobKindSchema,
    status: jobStatusSchema,
    progress: z.number().finite().min(0).max(1),
    message: z.string().optional()
});

export const jobProgressSchema = jobDescriptorSchema.extend({
    channel: z.literal('render.onProgress')
});

export const timelinePatchOperationSchema = z.object({
    op: z.enum([
        'addTrack',
        'updateTrack',
        'removeTrack',
        'addClip',
        'updateClip',
        'removeClip'
    ]),
    targetId: z.string().min(1).optional(),
    value: z.unknown().optional()
});

export const timelinePatchSchema = z.object({
    patchId: z.string().min(1),
    projectId: z.string().min(1),
    operations: z.array(timelinePatchOperationSchema).min(1)
});

const emptyResponseSchema = z.object({}).strict();
const projectPathSchema = z.object({
    projectPath: z.string().min(1)
});
const assetSourceSchema = z.object({
    assetId: z.string().min(1),
    sourcePath: z.string().min(1),
    cacheDir: z.string().min(1)
});

export const ipcContractSchemas = {
    'project.open': {
        request: projectPathSchema,
        response: projectDocumentSchema
    },
    'project.save': {
        request: projectPathSchema.extend({
            document: projectDocumentSchema
        }),
        response: z.object({
            projectPath: z.string().min(1),
            savedAt: z.string().datetime()
        })
    },
    'media.import': {
        request: z.object({
            paths: z.array(z.string().min(1)).min(1),
            mode: z.enum(['reference', 'copy'])
        }),
        response: z.array(assetSchema)
    },
    'media.probe': {
        request: z.object({
            path: z.string().min(1)
        }),
        response: assetSchema
    },
    'media.generateThumbs': {
        request: assetSourceSchema,
        response: z.object({
            assetId: z.string().min(1),
            thumbnailPath: z.string().min(1)
        })
    },
    'media.generateWaveform': {
        request: assetSourceSchema,
        response: z.object({
            assetId: z.string().min(1),
            waveformPath: z.string().min(1)
        })
    },
    'media.createProxy': {
        request: assetSourceSchema,
        response: z.object({
            assetId: z.string().min(1),
            proxyPath: z.string().min(1)
        })
    },
    'timeline.applyPatch': {
        request: timelinePatchSchema,
        response: z.object({
            document: projectDocumentSchema
        })
    },
    'render.start': {
        request: z.object({
            projectPath: z.string().min(1),
            document: projectDocumentSchema,
            outputPath: z.string().min(1)
        }),
        response: jobDescriptorSchema
    },
    'render.cancel': {
        request: z.object({
            jobId: z.string().min(1)
        }),
        response: jobDescriptorSchema
    },
    'ai.transcribe': {
        request: z.object({
            assetId: z.string().min(1),
            sourcePath: z.string().min(1),
            language: z.string().min(1).optional()
        }),
        response: jobDescriptorSchema
    },
    'ai.tts': {
        request: z.object({
            segmentId: z.string().min(1),
            text: z.string().min(1),
            voiceId: z.string().min(1).optional()
        }),
        response: jobDescriptorSchema
    },
    'ai.segmentScript': {
        request: z.object({
            script: z.string().min(1),
            targetDuration: z.number().finite().positive().optional()
        }),
        response: z.object({
            segmentIds: z.array(z.string().min(1))
        })
    },
    'ai.planStoryboard': {
        request: z.object({
            script: z.string().min(1)
        }),
        response: z.object({
            segmentIds: z.array(z.string().min(1))
        })
    },
    'ai.matchAssets': {
        request: z.object({
            segmentIds: z.array(z.string().min(1)).min(1),
            assetIds: z.array(z.string().min(1)).min(1)
        }),
        response: z.object({
            matches: z.array(
                z.object({
                    segmentId: z.string().min(1),
                    assetId: z.string().min(1),
                    score: z.number().finite().min(0).max(1)
                })
            )
        })
    }
} as const;

type IpcContractSchemas = typeof ipcContractSchemas;

export type IpcRequest<C extends IpcInvokeChannel> = z.infer<
    IpcContractSchemas[C]['request']
>;

export type IpcResponseData<C extends IpcInvokeChannel> = z.infer<
    IpcContractSchemas[C]['response']
>;

export type IpcResponse<C extends IpcInvokeChannel> = Result<
    IpcResponseData<C>
>;

export type JobDescriptor = z.infer<typeof jobDescriptorSchema>;
export type JobProgress = z.infer<typeof jobProgressSchema>;
export type TimelinePatch = z.infer<typeof timelinePatchSchema>;

export const ipcResultSchemas = IPC_INVOKE_CHANNELS.reduce(
    (schemas, channel) => ({
        ...schemas,
        [channel]: createResultSchema(ipcContractSchemas[channel].response)
    }),
    {} as Record<IpcInvokeChannel, ReturnType<typeof createResultSchema>>
);

export interface MiaomaApi {
    ping: () => Promise<Result<{ pong: true }>>;
    project: {
        open: (
            request: IpcRequest<'project.open'>
        ) => Promise<IpcResponse<'project.open'>>;
        save: (
            request: IpcRequest<'project.save'>
        ) => Promise<IpcResponse<'project.save'>>;
    };
    media: {
        import: (
            request: IpcRequest<'media.import'>
        ) => Promise<IpcResponse<'media.import'>>;
        probe: (
            request: IpcRequest<'media.probe'>
        ) => Promise<IpcResponse<'media.probe'>>;
        generateThumbs: (
            request: IpcRequest<'media.generateThumbs'>
        ) => Promise<IpcResponse<'media.generateThumbs'>>;
        generateWaveform: (
            request: IpcRequest<'media.generateWaveform'>
        ) => Promise<IpcResponse<'media.generateWaveform'>>;
        createProxy: (
            request: IpcRequest<'media.createProxy'>
        ) => Promise<IpcResponse<'media.createProxy'>>;
    };
    timeline: {
        applyPatch: (
            request: IpcRequest<'timeline.applyPatch'>
        ) => Promise<IpcResponse<'timeline.applyPatch'>>;
    };
    render: {
        start: (
            request: IpcRequest<'render.start'>
        ) => Promise<IpcResponse<'render.start'>>;
        cancel: (
            request: IpcRequest<'render.cancel'>
        ) => Promise<IpcResponse<'render.cancel'>>;
        onProgress: (listener: (progress: JobProgress) => void) => () => void;
    };
    ai: {
        transcribe: (
            request: IpcRequest<'ai.transcribe'>
        ) => Promise<IpcResponse<'ai.transcribe'>>;
        tts: (request: IpcRequest<'ai.tts'>) => Promise<IpcResponse<'ai.tts'>>;
        segmentScript: (
            request: IpcRequest<'ai.segmentScript'>
        ) => Promise<IpcResponse<'ai.segmentScript'>>;
        planStoryboard: (
            request: IpcRequest<'ai.planStoryboard'>
        ) => Promise<IpcResponse<'ai.planStoryboard'>>;
        matchAssets: (
            request: IpcRequest<'ai.matchAssets'>
        ) => Promise<IpcResponse<'ai.matchAssets'>>;
    };
}

export type IpcInvoker = <C extends IpcInvokeChannel>(
    channel: C,
    request: IpcRequest<C>
) => Promise<IpcResponse<C>>;
