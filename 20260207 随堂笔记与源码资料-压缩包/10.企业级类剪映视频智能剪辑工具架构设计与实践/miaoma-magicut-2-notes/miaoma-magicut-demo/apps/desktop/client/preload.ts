import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import {
    createSuccessResult,
    type IpcInvokeChannel,
    type IpcRequest,
    type IpcResponse,
    type JobProgress,
    type MiaomaApi
} from '@miaoma-magicut/shared';

const invoke = <C extends IpcInvokeChannel>(
    channel: C,
    request: IpcRequest<C>
): Promise<IpcResponse<C>> => ipcRenderer.invoke(channel, request);

const miaomaAPI: MiaomaApi = {
    ping: async () => createSuccessResult({ pong: true }),
    project: {
        open: (request) => invoke('project.open', request),
        save: (request) => invoke('project.save', request)
    },
    media: {
        import: (request) => invoke('media.import', request),
        probe: (request) => invoke('media.probe', request),
        generateThumbs: (request) => invoke('media.generateThumbs', request),
        generateWaveform: (request) =>
            invoke('media.generateWaveform', request),
        createProxy: (request) => invoke('media.createProxy', request)
    },
    timeline: {
        applyPatch: (request) => invoke('timeline.applyPatch', request)
    },
    render: {
        start: (request) => invoke('render.start', request),
        cancel: (request) => invoke('render.cancel', request),
        onProgress: (listener: (progress: JobProgress) => void) => {
            const handler = (_event: IpcRendererEvent, progress: JobProgress) =>
                listener(progress);

            ipcRenderer.on('render.onProgress', handler);

            return () =>
                ipcRenderer.removeListener('render.onProgress', handler);
        }
    },
    ai: {
        transcribe: (request) => invoke('ai.transcribe', request),
        tts: (request) => invoke('ai.tts', request),
        segmentScript: (request) => invoke('ai.segmentScript', request),
        planStoryboard: (request) => invoke('ai.planStoryboard', request),
        matchAssets: (request) => invoke('ai.matchAssets', request)
    }
};

contextBridge.exposeInMainWorld('miaomaAPI', miaomaAPI);
