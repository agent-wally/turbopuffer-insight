import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Monitor, Settings, Database, ChevronDown } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Badge } from '@renderer/components/ui/badge'
import { usePreferencesStore, useConnectionStore } from '@renderer/stores'
import { cn } from '@renderer/lib/utils'

export function Header() {
  const navigate = useNavigate()
  const { theme, setTheme } = usePreferencesStore()
  const { profiles, activeProfileId, status, latency } = useConnectionStore()

  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const themeIcon = {
    light: Sun,
    dark: Moon,
    system: Monitor
  }[theme]

  const ThemeIcon = themeIcon

  const statusColor = {
    disconnected: 'bg-muted-foreground',
    connecting: 'bg-warning animate-pulse',
    connected: 'bg-success',
    error: 'bg-destructive'
  }[status]

  return (
    <header className="drag-region flex h-12 items-center justify-between border-b bg-background pl-20 pr-4">
      <div className="no-drag flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <span className="font-semibold">Turbopuffer Insight</span>
        </div>
      </div>

      <div className="no-drag flex items-center gap-2">
        {/* Connection Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <span className={cn('h-2 w-2 rounded-full', statusColor)} />
              {activeProfile?.name || 'No Connection'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Connections</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profiles.length === 0 ? (
              <DropdownMenuItem disabled>No profiles configured</DropdownMenuItem>
            ) : (
              profiles.map((profile) => (
                <DropdownMenuItem
                  key={profile.id}
                  className="flex items-center justify-between"
                  onClick={() => useConnectionStore.getState().setActiveProfile(profile.id)}
                >
                  <span>{profile.name}</span>
                  {profile.id === activeProfileId && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Active
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/')}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Connections
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Latency indicator */}
        {status === 'connected' && latency !== null && (
          <Badge variant="outline" className="text-xs font-mono">
            {latency}ms
          </Badge>
        )}

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ThemeIcon className="h-4 w-4" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </header>
  )
}
