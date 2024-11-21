// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

window.Buffer = window.Buffer || require("buffer").Buffer;
import { contextBridge, ipcRenderer } from 'electron'

import {types} from 'knotfree-ts-lib'
// import * as types from './knotfree-ts-lib/types'

console.log("in preload.ts in the renderer process")

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateTestTopic: (callback: (value: any) => any) => ipcRenderer.on('my-testtopic-channel', (_event, value) => callback(value)),
    onLoadConfig: (callback: (value: types.ServerConfigList) => any) => ipcRenderer.on('load-config', (_event, value) => callback(value)),
    updateConfig: (value: types.ServerConfigList) => ipcRenderer.send('update-config', value),
    requestConfig: () => ipcRenderer.send('request-config', ""),
})