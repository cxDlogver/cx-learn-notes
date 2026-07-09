import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';

import {
    createFailureResult,
    createSuccessResult,
    IPC_INVOKE_CHANNELS,
    ipcContractSchemas,
    type IpcInvokeChannel,
    type IpcRequest,
    type IpcResponse,
    projectDocumentSchema
} from '@miaoma-magicut/shared';

export interface IpcHandlerDependencies {
    readTextFile: (path: string) => Promise<string>;
    writeTextFile: (path: string, content: string) => Promise<void>;
    now: () => string;
}

type IpcHandlerMap = {
    [C in IpcInvokeChannel]: (
        request: IpcRequest<C>
    ) => Promise<IpcResponse<C>>;
};

const createNotImplementedHandler =
    <C extends IpcInvokeChannel>(channel: C) =>
    async (): Promise<IpcResponse<C>> =>
        createFailureResult(
            'NOT_IMPLEMENTED',
            `${channel} handler is not implemented in Slice 1`
        ) as IpcResponse<C>;

const createDefaultDependencies = (): IpcHandlerDependencies => ({
    readTextFile: (path) => readFile(path, 'utf8'),
    writeTextFile: (path, content) => writeFile(path, content, 'utf8'),
    now: () => new Date().toISOString()
});

export const createMiaomaIpcHandlers = (
    dependencies: IpcHandlerDependencies = createDefaultDependencies()
): IpcHandlerMap => ({
    'project.open': async (request) => {
        try {
            const rawDocument = await dependencies.readTextFile(
                request.projectPath
            );
            const parsedJson: unknown = JSON.parse(rawDocument);
            const document = projectDocumentSchema.parse(parsedJson);

            return createSuccessResult(document);
        } catch (error) {
            return createFailureResult(
                'PROJECT_DOCUMENT_INVALID',
                '项目文件无法读取或不符合 project.miaoma.json v1 契约',
                error instanceof Error ? error.message : error
            );
        }
    },
    'project.save': async (request) => {
        try {
            const savedAt = dependencies.now();
            const document = projectDocumentSchema.parse({
                ...request.document,
                updatedAt: savedAt
            });

            await dependencies.writeTextFile(
                request.projectPath,
                `${JSON.stringify(document, null, 2)}\n`
            );

            return createSuccessResult({
                projectPath: request.projectPath,
                savedAt
            });
        } catch (error) {
            return createFailureResult(
                'PROJECT_DOCUMENT_SAVE_FAILED',
                '项目文件保存失败',
                error instanceof Error ? error.message : error
            );
        }
    },
    'media.import': createNotImplementedHandler('media.import'),
    'media.probe': createNotImplementedHandler('media.probe'),
    'media.generateThumbs': createNotImplementedHandler('media.generateThumbs'),
    'media.generateWaveform': createNotImplementedHandler(
        'media.generateWaveform'
    ),
    'media.createProxy': createNotImplementedHandler('media.createProxy'),
    'timeline.applyPatch': createNotImplementedHandler('timeline.applyPatch'),
    'render.start': createNotImplementedHandler('render.start'),
    'render.cancel': createNotImplementedHandler('render.cancel'),
    'ai.transcribe': createNotImplementedHandler('ai.transcribe'),
    'ai.tts': createNotImplementedHandler('ai.tts'),
    'ai.segmentScript': createNotImplementedHandler('ai.segmentScript'),
    'ai.planStoryboard': createNotImplementedHandler('ai.planStoryboard'),
    'ai.matchAssets': createNotImplementedHandler('ai.matchAssets')
});

export const registerMiaomaIpcHandlers = (
    dependencies?: IpcHandlerDependencies
): void => {
    const handlers = createMiaomaIpcHandlers(dependencies);

    for (const channel of IPC_INVOKE_CHANNELS) {
        ipcMain.handle(
            channel,
            async (_event: IpcMainInvokeEvent, request: unknown) => {
                const parsedRequest =
                    ipcContractSchemas[channel].request.safeParse(request);

                if (!parsedRequest.success) {
                    return createFailureResult(
                        'IPC_REQUEST_INVALID',
                        `${channel} request does not match the shared contract`,
                        parsedRequest.error.issues
                    );
                }

                return handlers[channel](
                    parsedRequest.data as never
                ) as Promise<IpcResponse<typeof channel>>;
            }
        );
    }
};
