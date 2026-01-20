import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  safeStorage,
  globalShortcut,
  Menu,
  session
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

// Store for encrypted API keys (in memory during session)
const apiKeyStore = new Map<string, string>()

// Path to persistent storage for encrypted API keys
const getApiKeysFilePath = (): string => {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'api-keys.json')
}

// Load encrypted API keys from disk
const loadApiKeysFromDisk = (): void => {
  try {
    const filePath = getApiKeysFilePath()
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8')
      const keys = JSON.parse(data)
      Object.entries(keys).forEach(([profileId, encryptedKey]) => {
        apiKeyStore.set(profileId, encryptedKey as string)
      })
      if (is.dev) {
        console.log(`[Main] Loaded ${apiKeyStore.size} API keys from disk`)
      }
    }
  } catch (error) {
    console.error('[Main] Failed to load API keys from disk:', error)
  }
}

// Save encrypted API keys to disk
const saveApiKeysToDisk = (): void => {
  try {
    const filePath = getApiKeysFilePath()
    const userDataPath = app.getPath('userData')

    // Ensure directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }

    const keys = Object.fromEntries(apiKeyStore)
    writeFileSync(filePath, JSON.stringify(keys, null, 2), 'utf-8')
    if (is.dev) {
      console.log(`[Main] Saved ${apiKeyStore.size} API keys to disk`)
    }
  } catch (error) {
    console.error('[Main] Failed to save API keys to disk:', error)
  }
}

let mainWindow: BrowserWindow | null = null

// Auto-updater configuration
function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Enable detailed logging
  autoUpdater.logger = console

  console.log('[AutoUpdater] Initializing auto-updater')
  console.log('[AutoUpdater] Current version:', app.getVersion())
  console.log('[AutoUpdater] Is dev mode:', is.dev)
  console.log('[AutoUpdater] Platform:', process.platform)

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available. Current version is latest:', info.version)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)
    mainWindow?.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Error:', error)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    console.log('[AutoUpdater] Download progress:', progressObj.percent)
  })

  // Check for updates (don't check in development)
  if (!is.dev) {
    console.log('[AutoUpdater] Starting update check...')
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[AutoUpdater] Check failed:', err)
    })
  } else {
    console.log('[AutoUpdater] Skipping update check (development mode)')
  }
}

// Content Security Policy
function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.turbopuffer.com https://*.turbopuffer.com https://github.com https://*.github.com https://objects.githubusercontent.com",
          "frame-src 'none'"
        ].join('; ')
      }
    })
  })
}

// Application menu with keyboard shortcuts
function setupMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: (): void => {
            if (!is.dev) {
              autoUpdater.checkForUpdates()
            }
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Turbopuffer Documentation',
          click: async (): Promise<void> => {
            await shell.openExternal('https://turbopuffer.com/docs')
          }
        },
        {
          label: 'Report Issue',
          click: async (): Promise<void> => {
            await shell.openExternal('https://github.com/agent-wally/turbopuffer-insight/issues')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 10 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // Set default zoom level (0.8 = 80%, equivalent to zooming out twice)
    mainWindow?.webContents.setZoomFactor(0.85)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.origin !== 'http://localhost:5173' && !url.startsWith('file://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// API request handler - bypasses CORS by making requests from main process
async function makeApiRequest(
  endpoint: string,
  method: string,
  apiKey: string,
  baseUrl: string,
  body?: string
): Promise<{ success: boolean; data?: unknown; error?: string; status?: number }> {
  // Validate baseUrl to prevent SSRF
  const allowedHosts = ['api.turbopuffer.com', 'localhost']
  try {
    const url = new URL(baseUrl)
    if (
      !allowedHosts.some(
        (host) => url.hostname === host || url.hostname.endsWith('.turbopuffer.com')
      )
    ) {
      return { success: false, error: 'Invalid API host' }
    }
  } catch {
    return { success: false, error: 'Invalid base URL' }
  }

  const fullUrl = `${baseUrl}${endpoint}`

  if (is.dev) {
    console.log(`[Main] API Request: ${method} ${fullUrl}`)
    if (body) {
      console.log(`[Main] Request Body:`, body)
    }
  }

  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }

    if (body) {
      options.body = body
    }

    const response = await fetch(fullUrl, options)

    if (is.dev) {
      console.log(`[Main] API Response: ${response.status}`)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      if (is.dev) {
        console.log(`[Main] API Error Response:`, JSON.stringify(errorData, null, 2))
      }
      return {
        success: false,
        error: errorData.error || `API Error: ${response.status}`,
        status: response.status
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('[Main] API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// IPC Handlers
function setupIpcHandlers(): void {
  // Store API key securely
  ipcMain.handle('store-api-key', async (_event, profileId: string, apiKey: string) => {
    try {
      // Basic validation
      if (!profileId || typeof profileId !== 'string') {
        return { success: false, error: 'Invalid profile ID' }
      }
      if (!apiKey || typeof apiKey !== 'string') {
        return { success: false, error: 'Invalid API key' }
      }

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(apiKey)
        apiKeyStore.set(profileId, encrypted.toString('base64'))
      } else {
        // Fallback to plain storage (less secure)
        apiKeyStore.set(profileId, apiKey)
      }

      // Persist to disk
      saveApiKeysToDisk()

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Retrieve API key
  ipcMain.handle('get-api-key', async (_event, profileId: string) => {
    try {
      if (!profileId || typeof profileId !== 'string') {
        return { success: false, error: 'Invalid profile ID' }
      }

      const stored = apiKeyStore.get(profileId)
      if (!stored) return { success: false, error: 'Not found' }

      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(Buffer.from(stored, 'base64'))
        return { success: true, apiKey: decrypted }
      } else {
        return { success: true, apiKey: stored }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Remove API key
  ipcMain.handle('remove-api-key', async (_event, profileId: string) => {
    if (profileId && typeof profileId === 'string') {
      apiKeyStore.delete(profileId)
      // Persist to disk
      saveApiKeysToDisk()
    }
    return { success: true }
  })

  // API: List namespaces
  ipcMain.handle(
    'api:list-namespaces',
    async (
      _event,
      {
        apiKey,
        baseUrl,
        cursor,
        prefix,
        pageSize
      }: {
        apiKey: string
        baseUrl: string
        cursor?: string
        prefix?: string
        pageSize?: number
      }
    ) => {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      if (prefix) params.set('prefix', prefix)
      params.set('page_size', String(Math.min(pageSize || 100, 1000)))

      const query = params.toString()
      return makeApiRequest(`/v1/namespaces${query ? `?${query}` : ''}`, 'GET', apiKey, baseUrl)
    }
  )

  // API: Get namespace metadata
  ipcMain.handle(
    'api:get-namespace-metadata',
    async (
      _event,
      { apiKey, baseUrl, namespaceId }: { apiKey: string; baseUrl: string; namespaceId: string }
    ) => {
      if (!namespaceId) {
        return { success: false, error: 'Namespace ID required' }
      }
      return makeApiRequest(
        `/v1/namespaces/${encodeURIComponent(namespaceId)}/metadata`,
        'GET',
        apiKey,
        baseUrl
      )
    }
  )

  // API: Query documents
  ipcMain.handle(
    'api:query',
    async (
      _event,
      {
        apiKey,
        baseUrl,
        namespaceId,
        query
      }: { apiKey: string; baseUrl: string; namespaceId: string; query: object }
    ) => {
      if (!namespaceId) {
        return { success: false, error: 'Namespace ID required' }
      }
      if (is.dev) {
        console.log('[Main] Query request body:', JSON.stringify(query, null, 2))
      }
      return makeApiRequest(
        `/v2/namespaces/${encodeURIComponent(namespaceId)}/query`,
        'POST',
        apiKey,
        baseUrl,
        JSON.stringify(query)
      )
    }
  )

  // API: Test connection
  ipcMain.handle(
    'api:test-connection',
    async (_event, { apiKey, baseUrl }: { apiKey: string; baseUrl: string }) => {
      const start = performance.now()
      const result = await makeApiRequest('/v1/namespaces?page_size=1', 'GET', apiKey, baseUrl)
      const latency = Math.round(performance.now() - start)

      return {
        ...result,
        latency
      }
    }
  )

  // Auto-updater IPC
  ipcMain.handle('check-for-updates', async () => {
    if (is.dev) {
      return { available: false }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { available: !!result?.updateInfo }
    } catch {
      return { available: false }
    }
  })

  ipcMain.handle('download-update', async () => {
    if (!is.dev) {
      await autoUpdater.downloadUpdate()
    }
  })

  ipcMain.handle('install-update', () => {
    if (!is.dev) {
      autoUpdater.quitAndInstall()
    }
  })

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.turbopuffer.insight')

  // Load encrypted API keys from disk
  loadApiKeysFromDisk()

  // Setup security
  setupCSP()
  setupMenu()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIpcHandlers()
  createWindow()

  // Setup auto-updater after window is created
  setupAutoUpdater()

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools()
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
