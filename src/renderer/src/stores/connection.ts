import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ConnectionProfile {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  createdAt: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ConnectionState {
  profiles: ConnectionProfile[]
  activeProfileId: string | null
  status: ConnectionStatus
  error: string | null
  latency: number | null
  apiKeysLoaded: boolean

  // Actions
  addProfile: (profile: Omit<ConnectionProfile, 'id' | 'createdAt'>) => string
  updateProfile: (id: string, updates: Partial<Omit<ConnectionProfile, 'id' | 'createdAt'>>) => void
  deleteProfile: (id: string) => void
  setActiveProfile: (id: string | null) => void
  setStatus: (status: ConnectionStatus, error?: string | null) => void
  setLatency: (latency: number | null) => void
  getActiveProfile: () => ConnectionProfile | null
  loadApiKeys: () => Promise<void>
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      status: 'disconnected',
      error: null,
      latency: null,
      apiKeysLoaded: false,

      addProfile: (profile) => {
        const id = crypto.randomUUID()
        const newProfile: ConnectionProfile = {
          ...profile,
          id,
          createdAt: new Date().toISOString()
        }
        set((state) => ({
          profiles: [...state.profiles, newProfile]
        }))

        // Store API key securely
        window.api.storeApiKey(id, profile.apiKey).catch(console.error)

        return id
      },

      updateProfile: (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p))
        }))

        // Update API key in secure storage if provided
        if (updates.apiKey) {
          window.api.storeApiKey(id, updates.apiKey).catch(console.error)
        }
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId
        }))

        // Remove API key from secure storage
        window.api.removeApiKey(id).catch(console.error)
      },

      setActiveProfile: (id) => {
        set({ activeProfileId: id, status: 'disconnected', error: null, latency: null })
      },

      setStatus: (status, error = null) => {
        set({ status, error })
      },

      setLatency: (latency) => {
        set({ latency })
      },

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get()
        return profiles.find((p) => p.id === activeProfileId) || null
      },

      loadApiKeys: async () => {
        const { profiles, apiKeysLoaded } = get()
        if (apiKeysLoaded) return

        // Load API keys for all profiles from secure storage
        const updatedProfiles = await Promise.all(
          profiles.map(async (profile) => {
            if (profile.apiKey) return profile // Already has API key in memory

            try {
              const result = await window.api.getApiKey(profile.id)
              if (result.success && result.apiKey) {
                return { ...profile, apiKey: result.apiKey }
              }
            } catch (error) {
              console.error(`Failed to load API key for profile ${profile.id}:`, error)
            }
            return profile
          })
        )

        set({ profiles: updatedProfiles, apiKeysLoaded: true })
      }
    }),
    {
      name: 'turbopuffer-connections',
      partialize: (state) => ({
        profiles: state.profiles.map((p) => ({ ...p, apiKey: '' })), // Don't persist API keys in localStorage
        activeProfileId: state.activeProfileId
      })
    }
  )
)
