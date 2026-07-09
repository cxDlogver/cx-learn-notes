import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('miaomaAPI', {
    ping: async () => ({ success: true })
});
