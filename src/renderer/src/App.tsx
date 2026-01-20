import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'
import { Header } from '@renderer/components/layout/Header'
import { Sidebar } from '@renderer/components/layout/Sidebar'
import { HomePage } from '@renderer/pages/Home'
import { NamespacePage } from '@renderer/pages/Namespace'
import { useConnectionStore } from '@renderer/stores'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const loadApiKeys = useConnectionStore((state) => state.loadApiKeys)
  const getActiveProfile = useConnectionStore((state) => state.getActiveProfile)
  const setStatus = useConnectionStore((state) => state.setStatus)
  const setLatency = useConnectionStore((state) => state.setLatency)

  useEffect(() => {
    const initializeConnection = async () => {
      await loadApiKeys()

      // Auto-reconnect if there's an active profile
      const activeProfile = getActiveProfile()
      if (activeProfile?.apiKey) {
        setStatus('connecting')
        try {
          const result = await window.api.testConnection({
            apiKey: activeProfile.apiKey,
            baseUrl: activeProfile.baseUrl
          })
          if (result.success) {
            setStatus('connected')
            setLatency(result.latency)
          } else {
            setStatus('error', result.error)
          }
        } catch (error) {
          setStatus('error', error instanceof Error ? error.message : 'Connection failed')
        }
      }
    }

    initializeConnection()
  }, [loadApiKeys, getActiveProfile, setStatus, setLatency])

  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AppInitializer>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/namespace/:namespaceId" element={<NamespacePage />} />
                </Routes>
              </AppLayout>
            </AppInitializer>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
