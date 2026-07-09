import { describe, expect, it } from 'vitest';

import {
    createFailureResult,
    createSuccessResult,
    IPC_EVENT_CHANNELS,
    IPC_INVOKE_CHANNELS,
    isIpcInvokeChannel,
    projectDocumentSchema
} from './index';

const minimalProjectDocument = {
    schemaVersion: 1,
    projectId: 'project-001',
    name: 'MVP 验证项目',
    canvas: {
        width: 1920,
        height: 1080,
        fps: 30
    },
    assets: [
        {
            id: 'asset-video-001',
            path: '/tmp/source.mp4',
            mediaType: 'video',
            duration: 12,
            width: 1920,
            height: 1080,
            fps: 30,
            hash: 'sha256:video'
        }
    ],
    tracks: [
        {
            id: 'track-video-001',
            type: 'video',
            name: '视频 1',
            locked: false,
            muted: false,
            visible: true,
            order: 0
        }
    ],
    clips: [
        {
            id: 'clip-video-001',
            assetId: 'asset-video-001',
            trackId: 'track-video-001',
            start: 0,
            duration: 8,
            sourceIn: 2,
            sourceOut: 10,
            volume: 1,
            speed: 1,
            transform: {
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                opacity: 1
            }
        }
    ],
    subtitles: [],
    aiSegments: [],
    exportSettings: {
        format: 'mp4',
        codec: 'h264',
        audioCodec: 'aac',
        width: 1920,
        height: 1080,
        fps: 30,
        sampleRate: 48000
    },
    updatedAt: '2026-07-04T00:00:00.000Z'
};

describe('shared contracts', () => {
    it('defines the v1 IPC invoke and event channel allowlists', () => {
        expect(IPC_INVOKE_CHANNELS).toEqual([
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
        ]);
        expect(IPC_EVENT_CHANNELS).toEqual(['render.onProgress']);
        expect(isIpcInvokeChannel('project.open')).toBe(true);
        expect(isIpcInvokeChannel('fs.readFile')).toBe(false);
    });

    it('uses a discriminated Result contract for IPC responses', () => {
        expect(createSuccessResult({ projectId: 'project-001' })).toEqual({
            ok: true,
            data: { projectId: 'project-001' }
        });
        expect(createFailureResult('NOT_IMPLEMENTED', '等待后端实现')).toEqual({
            ok: false,
            error: {
                code: 'NOT_IMPLEMENTED',
                message: '等待后端实现'
            }
        });
    });

    it('accepts a valid MVP project document', () => {
        const parsed = projectDocumentSchema.safeParse(minimalProjectDocument);

        expect(parsed.success).toBe(true);
    });

    it('rejects clip ranges where sourceOut is before sourceIn', () => {
        const parsed = projectDocumentSchema.safeParse({
            ...minimalProjectDocument,
            clips: [
                {
                    ...minimalProjectDocument.clips[0],
                    sourceIn: 10,
                    sourceOut: 2
                }
            ]
        });

        expect(parsed.success).toBe(false);
    });
});
