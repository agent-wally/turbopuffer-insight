import { ElectronAPI } from '@electron-toolkit/preload'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  status?: number
  latency?: number
}

interface TurbopufferApi {
  listNamespaces: (params: {
    apiKey: string
    baseUrl: string
    cursor?: string
    prefix?: string
    pageSize?: number
  }) => Promise<ApiResponse>

  getNamespaceMetadata: (params: {
    apiKey: string
    baseUrl: string
    namespaceId: string
  }) => Promise<ApiResponse>

  query: (params: {
    apiKey: string
    baseUrl: string
    namespaceId: string
    query: object
  }) => Promise<ApiResponse>

  testConnection: (params: {
    apiKey: string
    baseUrl: string
  }) => Promise<ApiResponse & { latency: number }>

  storeApiKey: (profileId: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
  getApiKey: (profileId: string) => Promise<{ success: boolean; apiKey?: string; error?: string }>
  removeApiKey: (profileId: string) => Promise<{ success: boolean }>

  // Auto-updates
  checkForUpdates: () => Promise<{ available: boolean }>
  downloadUpdate: () => Promise<void>
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: unknown) => void) => void
  onUpdateDownloaded: (callback: (info: unknown) => void) => void

  // App info
  getAppVersion: () => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TurbopufferApi
  }
}
