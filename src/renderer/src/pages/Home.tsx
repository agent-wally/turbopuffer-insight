import { useState } from 'react'
import { Database, Plus, Trash2, Check, Loader2, ExternalLink, Pencil } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Badge } from '@renderer/components/ui/badge'
import { useConnectionStore, type ConnectionProfile } from '@renderer/stores'
import { useTestConnection } from '@renderer/api'
import { formatDate } from '@renderer/lib/utils'

export function HomePage() {
  const [isAddingProfile, setIsAddingProfile] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null)
  const [profileName, setProfileName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.turbopuffer.com')

  const {
    profiles,
    activeProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    setStatus,
    setLatency
  } = useConnectionStore()

  const testConnection = useTestConnection()

  const resetForm = () => {
    setProfileName('')
    setApiKey('')
    setBaseUrl('https://api.turbopuffer.com')
    setEditingProfile(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsAddingProfile(true)
  }

  const openEditDialog = (profile: ConnectionProfile) => {
    setProfileName(profile.name)
    setApiKey(profile.apiKey)
    setBaseUrl(profile.baseUrl)
    setEditingProfile(profile)
  }

  const closeDialog = () => {
    setIsAddingProfile(false)
    setEditingProfile(null)
    resetForm()
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !apiKey.trim()) return

    const finalBaseUrl = baseUrl.trim() || 'https://api.turbopuffer.com'

    if (editingProfile) {
      // Update existing profile
      updateProfile(editingProfile.id, {
        name: profileName.trim(),
        apiKey: apiKey.trim(),
        baseUrl: finalBaseUrl
      })

      // If this is the active profile, reconnect
      if (editingProfile.id === activeProfileId) {
        setStatus('connecting')
        const result = await testConnection.mutateAsync({
          apiKey: apiKey.trim(),
          baseUrl: finalBaseUrl
        })

        if (result.success) {
          setStatus('connected')
          setLatency(result.latency)
        } else {
          setStatus('error', result.error)
        }
      }
    } else {
      // Add new profile
      const id = addProfile({
        name: profileName.trim(),
        apiKey: apiKey.trim(),
        baseUrl: finalBaseUrl
      })

      // Test and activate the new connection
      setActiveProfile(id)
      setStatus('connecting')

      const result = await testConnection.mutateAsync({
        apiKey: apiKey.trim(),
        baseUrl: finalBaseUrl
      })

      if (result.success) {
        setStatus('connected')
        setLatency(result.latency)
      } else {
        setStatus('error', result.error)
      }
    }

    closeDialog()
  }

  const handleConnect = async (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return

    setActiveProfile(profileId)
    setStatus('connecting')

    const result = await testConnection.mutateAsync({
      apiKey: profile.apiKey,
      baseUrl: profile.baseUrl
    })

    if (result.success) {
      setStatus('connected')
      setLatency(result.latency)
    } else {
      setStatus('error', result.error)
    }
  }

  const isDialogOpen = isAddingProfile || editingProfile !== null

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-4xl">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Database className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Turbopuffer Insight</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Browse, explore, and analyze your Turbopuffer vector database namespaces with a
            professional GUI.
          </p>
        </div>

        {/* Connection Profiles */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Connection Profiles</h2>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? 'Edit Connection Profile' : 'Add Connection Profile'}
              </DialogTitle>
              <DialogDescription>
                {editingProfile
                  ? 'Update the connection settings for this profile.'
                  : 'Create a new connection profile to connect to your Turbopuffer account.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production, Development"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={editingProfile ? '••••••••' : 'tpuf_...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from the{' '}
                  <a
                    href="https://turbopuffer.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Turbopuffer Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL (optional)</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.turbopuffer.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave default unless using a custom endpoint.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={!profileName.trim() || !apiKey.trim() || testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingProfile ? 'Saving...' : 'Connecting...'}
                  </>
                ) : editingProfile ? (
                  'Save Changes'
                ) : (
                  'Add & Connect'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Cards */}
        {profiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No connection profiles yet</p>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Connection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId
              return (
                <Card key={profile.id} className={isActive ? 'border-primary' : undefined}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {profile.name}
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 font-mono text-xs">
                          {profile.baseUrl}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(profile)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteProfile(profile.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xs text-muted-foreground">
                      Created {formatDate(profile.createdAt)}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isActive ? 'secondary' : 'default'}
                      onClick={() => handleConnect(profile.id)}
                      disabled={testConnection.isPending}
                    >
                      {testConnection.isPending && profile.id === activeProfileId ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : isActive ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Connected
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <a
            href="https://turbopuffer.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-lg border p-4 hover:border-primary transition-colors"
          >
            <h3 className="font-semibold mb-1 group-hover:text-primary">Documentation</h3>
            <p className="text-sm text-muted-foreground">
              Learn about Turbopuffer APIs and features
            </p>
          </a>
          <a
            href="https://turbopuffer.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-lg border p-4 hover:border-primary transition-colors"
          >
            <h3 className="font-semibold mb-1 group-hover:text-primary">Dashboard</h3>
            <p className="text-sm text-muted-foreground">Manage your account and API keys</p>
          </a>
          <a
            href="https://github.com/turbopuffer/turbopuffer-python"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-lg border p-4 hover:border-primary transition-colors"
          >
            <h3 className="font-semibold mb-1 group-hover:text-primary">Python SDK</h3>
            <p className="text-sm text-muted-foreground">Official Python client library</p>
          </a>
        </div>
      </div>
    </div>
  )
}
