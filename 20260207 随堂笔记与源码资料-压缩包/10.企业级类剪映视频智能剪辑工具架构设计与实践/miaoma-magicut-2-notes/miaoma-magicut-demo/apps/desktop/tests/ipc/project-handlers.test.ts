import { describe, expect, it, vi } from 'vitest';

import type { ProjectDocument } from '@miaoma-magicut/shared';

import { createMiaomaIpcHandlers } from '../../client/ipc-handlers';

const validProject: ProjectDocument = {
    schemaVersion: 1,
    projectId: 'project-001',
    name: 'MVP 验证项目',
    canvas: {
        width: 1920,
        height: 1080,
        fps: 30
    },
    assets: [],
    tracks: [],
    clips: [],
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

describe('project IPC handlers', () => {
    it('opens and validates a project document from disk', async () => {
        const handlers = createMiaomaIpcHandlers({
            readTextFile: vi
                .fn()
                .mockResolvedValueOnce(JSON.stringify(validProject)),
            writeTextFile: vi.fn(),
            now: () => '2026-07-04T01:00:00.000Z'
        });

        const result = await handlers['project.open']({
            projectPath: '/tmp/project.miaoma.json'
        });

        expect(result).toEqual({
            ok: true,
            data: validProject
        });
    });

    it('rejects invalid project documents without throwing across IPC', async () => {
        const handlers = createMiaomaIpcHandlers({
            readTextFile: vi.fn().mockResolvedValueOnce(JSON.stringify({})),
            writeTextFile: vi.fn(),
            now: () => '2026-07-04T01:00:00.000Z'
        });

        const result = await handlers['project.open']({
            projectPath: '/tmp/project.miaoma.json'
        });

        if (result.ok === false) {
            expect(result.error.code).toBe('PROJECT_DOCUMENT_INVALID');
            return;
        }

        throw new Error('Expected project.open to fail validation');
    });

    it('saves a valid project document with a fresh updatedAt value', async () => {
        const writeTextFile = vi.fn().mockResolvedValueOnce(undefined);
        const handlers = createMiaomaIpcHandlers({
            readTextFile: vi.fn(),
            writeTextFile,
            now: () => '2026-07-04T01:00:00.000Z'
        });

        const result = await handlers['project.save']({
            projectPath: '/tmp/project.miaoma.json',
            document: validProject
        });

        expect(result).toEqual({
            ok: true,
            data: {
                projectPath: '/tmp/project.miaoma.json',
                savedAt: '2026-07-04T01:00:00.000Z'
            }
        });
        expect(writeTextFile).toHaveBeenCalledWith(
            '/tmp/project.miaoma.json',
            `${JSON.stringify(
                {
                    ...validProject,
                    updatedAt: '2026-07-04T01:00:00.000Z'
                },
                null,
                2
            )}\n`
        );
    });
});
