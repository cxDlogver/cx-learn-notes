import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MiaomaApi } from '@miaoma-magicut/shared';

const electronMock = vi.hoisted(() => ({
    exposeInMainWorld: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
}));

vi.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: electronMock.exposeInMainWorld
    },
    ipcRenderer: {
        invoke: electronMock.invoke,
        on: electronMock.on,
        removeListener: electronMock.removeListener
    }
}));

describe('preload contract', () => {
    beforeEach(() => {
        vi.resetModules();
        electronMock.exposeInMainWorld.mockReset();
        electronMock.invoke.mockReset();
        electronMock.on.mockReset();
        electronMock.removeListener.mockReset();
    });

    it('exposes the typed miaoma API without leaking raw ipcRenderer', async () => {
        await import('../../client/preload');

        expect(electronMock.exposeInMainWorld).toHaveBeenCalledTimes(1);

        const [name, api] = electronMock.exposeInMainWorld.mock.calls[0] as [
            string,
            MiaomaApi
        ];

        expect(name).toBe('miaomaAPI');
        expect(Object.keys(api).sort()).toEqual([
            'ai',
            'media',
            'ping',
            'project',
            'render',
            'timeline'
        ]);
        expect('ipcRenderer' in api).toBe(false);
        expect('send' in api).toBe(false);
        expect('on' in api).toBe(false);
    });

    it('forwards typed project calls to whitelisted channels', async () => {
        await import('../../client/preload');

        const [, api] = electronMock.exposeInMainWorld.mock.calls[0] as [
            string,
            MiaomaApi
        ];

        electronMock.invoke.mockResolvedValueOnce({ ok: true, data: {} });

        await api.project.open({ projectPath: '/tmp/project.miaoma.json' });

        expect(electronMock.invoke).toHaveBeenCalledWith('project.open', {
            projectPath: '/tmp/project.miaoma.json'
        });
    });

    it('returns an unsubscribe function for render progress listeners', async () => {
        await import('../../client/preload');

        const [, api] = electronMock.exposeInMainWorld.mock.calls[0] as [
            string,
            MiaomaApi
        ];
        const listener = vi.fn();

        const unsubscribe = api.render.onProgress(listener);

        expect(electronMock.on).toHaveBeenCalledOnce();
        unsubscribe();
        expect(electronMock.removeListener).toHaveBeenCalledOnce();
    });
});
