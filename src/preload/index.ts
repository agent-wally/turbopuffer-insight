import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer - Turbopuffer API calls via IPC
const api = {
  // API calls (routed through main process to bypass CORS)
  listNamespaces: (params: {
    apiKey: string
    baseUrl: string
    cursor?: string
    prefix?: string
    pageSize?: number
  }) => ipcRenderer.invoke('api:list-namespaces', params),

  getNamespaceMetadata: (params: { apiKey: string; baseUrl: string; namespaceId: string }) =>
    ipcRenderer.invoke('api:get-namespace-metadata', params),

  query: (params: { apiKey: string; baseUrl: string; namespaceId: string; query: object }) =>
    ipcRenderer.invoke('api:query', params),

  testConnection: (params: { apiKey: string; baseUrl: string }) =>
    ipcRenderer.invoke('api:test-connection', params),

  // Secure API key storage
  storeApiKey: (profileId: string, apiKey: string) =>
    ipcRenderer.invoke('store-api-key', profileId, apiKey),

  getApiKey: (profileId: string) => ipcRenderer.invoke('get-api-key', profileId),

  removeApiKey: (profileId: string) => ipcRenderer.invoke('remove-api-key', profileId),

  // Auto-updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: (info: unknown) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info))
  },
  onUpdateDownloaded: (callback: (info: unknown) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info))
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
}

// Expose APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
