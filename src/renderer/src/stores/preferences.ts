import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type ViewMode = 'table' | 'json' | 'card'

interface PreferencesState {
  theme: Theme
  sidebarCollapsed: boolean
  sidebarWidth: number
  defaultPageSize: number
  defaultViewMode: ViewMode
  recentNamespaces: string[]
  namespaceDelimiter: string
  namespaceTreeView: boolean

  // Actions
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  setDefaultPageSize: (size: number) => void
  setDefaultViewMode: (mode: ViewMode) => void
  addRecentNamespace: (namespace: string) => void
  setNamespaceDelimiter: (delimiter: string) => void
  setNamespaceTreeView: (enabled: boolean) => void
}

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 500
const DEFAULT_SIDEBAR_WIDTH = 256

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      defaultPageSize: 50,
      defaultViewMode: 'table',
      recentNamespaces: [],
      namespaceDelimiter: '_',
      namespaceTreeView: true,

      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          root.classList.add(systemTheme)
        } else {
          root.classList.add(theme)
        }
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed })
      },

      setSidebarWidth: (width) => {
        // Clamp width between min and max
        const clampedWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width))
        set({ sidebarWidth: clampedWidth })
      },

      setDefaultPageSize: (size) => {
        set({ defaultPageSize: size })
      },

      setDefaultViewMode: (mode) => {
        set({ defaultViewMode: mode })
      },

      addRecentNamespace: (namespace) => {
        set((state) => {
          const filtered = state.recentNamespaces.filter((n) => n !== namespace)
          return {
            recentNamespaces: [namespace, ...filtered].slice(0, 10)
          }
        })
      },

      setNamespaceDelimiter: (delimiter) => {
        set({ namespaceDelimiter: delimiter })
      },

      setNamespaceTreeView: (enabled) => {
        set({ namespaceTreeView: enabled })
      }
    }),
    {
      name: 'turbopuffer-preferences'
    }
  )
)

// Initialize theme on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('turbopuffer-preferences')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      const theme = state?.theme || 'dark'
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
    } catch {
      document.documentElement.classList.add('dark')
    }
  } else {
    document.documentElement.classList.add('dark')
  }
}
