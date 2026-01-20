import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Database,
  FolderTree,
  Folder,
  FolderOpen,
  Search,
  Star,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Plus,
  Settings,
  GitBranch
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Skeleton } from '@renderer/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@renderer/components/ui/popover'
import { Label } from '@renderer/components/ui/label'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'
import { useNamespaces, usePrefetchNamespaceMetadata, NamespaceListItem } from '@renderer/api'
import { usePreferencesStore, useConnectionStore } from '@renderer/stores'

// Tree node structure for namespace hierarchy
interface NamespaceTreeNode {
  name: string // The segment name (e.g., "project" or "module")
  fullPath: string // Full namespace path up to this node
  namespace?: NamespaceListItem // Only set for leaf nodes that are actual namespaces
  children: Map<string, NamespaceTreeNode>
}

// Build tree structure from flat namespace list
function buildNamespaceTree(
  namespaces: NamespaceListItem[],
  delimiter: string
): NamespaceTreeNode {
  const root: NamespaceTreeNode = {
    name: '',
    fullPath: '',
    children: new Map()
  }

  for (const ns of namespaces) {
    const parts = ns.id.split(delimiter)
    let current = root
    let pathSoFar = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      pathSoFar = pathSoFar ? `${pathSoFar}${delimiter}${part}` : part

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: pathSoFar,
          children: new Map()
        })
      }

      current = current.children.get(part)!

      // If this is the last part, it's a leaf node with the namespace
      if (i === parts.length - 1) {
        current.namespace = ns
      }
    }
  }

  return root
}

// Recursive component to render tree nodes
function TreeNodeComponent({
  node,
  depth,
  expandedNodes,
  toggleNode,
  location,
  navigate,
  prefetchMetadata
}: {
  node: NamespaceTreeNode
  depth: number
  expandedNodes: Set<string>
  toggleNode: (path: string) => void
  location: { pathname: string }
  navigate: (path: string) => void
  prefetchMetadata: (id: string) => void
}) {
  const isExpanded = expandedNodes.has(node.fullPath)
  const hasChildren = node.children.size > 0
  const isLeaf = node.namespace !== undefined
  const encodedId = node.namespace ? encodeURIComponent(node.namespace.id) : ''
  const isActive = isLeaf && location.pathname === `/namespace/${encodedId}`

  // If it's a leaf node (actual namespace), render as clickable item
  if (isLeaf && !hasChildren) {
    return (
      <button
        onClick={() => navigate(`/namespace/${encodedId}`)}
        onMouseEnter={() => prefetchMetadata(node.namespace!.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
    )
  }

  // If it's a folder node (has children or is intermediate)
  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            toggleNode(node.fullPath)
          }
          // If this folder is also a namespace, navigate to it
          if (isLeaf) {
            navigate(`/namespace/${encodedId}`)
          }
        }}
        onMouseEnter={() => isLeaf && prefetchMetadata(node.namespace!.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && hasChildren && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <TreeNodeComponent
                key={child.fullPath}
                node={child}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                location={location}
                navigate={navigate}
                prefetchMetadata={prefetchMetadata}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set(['active']))
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(new Set())
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const {
    sidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    namespaceDelimiter,
    namespaceTreeView,
    setNamespaceDelimiter,
    setNamespaceTreeView
  } = usePreferencesStore()
  const { status, activeProfileId, profiles } = useConnectionStore()

  // Handle mouse move during resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      setSidebarWidth(newWidth)
    },
    [isResizing, setSidebarWidth]
  )

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  // Add/remove event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])
  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching
  } = useNamespaces(searchQuery || undefined)

  const prefetchMetadata = usePrefetchNamespaceMetadata()

  const allNamespaces = data?.pages.flatMap((page) => page.namespaces) || []

  // Build tree structure from namespaces
  const namespaceTree = useMemo(() => {
    if (!namespaceTreeView || !allNamespaces.length) return null
    return buildNamespaceTree(allNamespaces, namespaceDelimiter)
  }, [allNamespaces, namespaceDelimiter, namespaceTreeView])

  // Toggle tree node expansion
  const toggleTreeNode = useCallback((path: string) => {
    setExpandedTreeNodes((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const toggleProfile = (profileId: string) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev)
      if (next.has(profileId)) {
        next.delete(profileId)
      } else {
        next.add(profileId)
      }
      return next
    })
  }

  if (sidebarCollapsed) {
    return (
      <div className="flex w-12 flex-col border-r bg-sidebar">
        <TooltipProvider>
          <div className="flex flex-col items-center gap-2 p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link to="/">
                    <FolderTree className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Namespaces</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Star className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Favorites</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div
      ref={sidebarRef}
      className="flex flex-col border-r bg-sidebar relative"
      style={{ width: sidebarWidth }}
    >
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter namespaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 bg-sidebar-accent border-sidebar-border"
          />
        </div>
      </div>

      {/* Namespace List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Connection Section */}
          {activeProfile && (
            <div className="mb-2">
              <button
                onClick={() => toggleProfile('active')}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              >
                {expandedProfiles.has('active') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Database className="h-4 w-4 text-primary" />
                <span className="truncate">{activeProfile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    refetch()
                  }}
                >
                  <RefreshCw
                    className={cn('h-3 w-3', isRefetching && 'animate-spin')}
                  />
                </Button>
              </button>

              {expandedProfiles.has('active') && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {status !== 'connected' ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {status === 'connecting'
                        ? 'Connecting...'
                        : status === 'error'
                          ? 'Connection error'
                          : 'Not connected'}
                    </div>
                  ) : isLoading ? (
                    <div className="space-y-2 p-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : allNamespaces.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {searchQuery ? 'No matching namespaces' : 'No namespaces found'}
                    </div>
                  ) : namespaceTreeView && namespaceTree ? (
                    // Tree view
                    <>
                      {Array.from(namespaceTree.children.values())
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((child) => (
                          <TreeNodeComponent
                            key={child.fullPath}
                            node={child}
                            depth={0}
                            expandedNodes={expandedTreeNodes}
                            toggleNode={toggleTreeNode}
                            location={location}
                            navigate={navigate}
                            prefetchMetadata={prefetchMetadata}
                          />
                        ))}
                      {hasNextPage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                        >
                          {isFetchingNextPage ? 'Loading...' : 'Load more'}
                        </Button>
                      )}
                    </>
                  ) : (
                    // Flat list view
                    <>
                      {allNamespaces.map((ns) => {
                        const encodedId = encodeURIComponent(ns.id)
                        const isActive = location.pathname === `/namespace/${encodedId}`
                        return (
                          <button
                            key={ns.id}
                            onClick={() => navigate(`/namespace/${encodedId}`)}
                            onMouseEnter={() => prefetchMetadata(ns.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                              isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent'
                            )}
                          >
                            <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{ns.id}</span>
                          </button>
                        )
                      })}
                      {hasNextPage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                        >
                          {isFetchingNextPage ? 'Loading...' : 'Load more'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No connection */}
          {!activeProfile && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Database className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No connection configured</p>
              <Button size="sm" onClick={() => navigate('/')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Connection
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-sidebar-muted">
            {allNamespaces.length > 0 && (
              <>
                {allNamespaces.length.toLocaleString()}
                {hasNextPage && '+'} namespaces
              </>
            )}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end" side="top">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">View Settings</h4>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tree-view" className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Tree view
                  </Label>
                  <Switch
                    id="tree-view"
                    checked={namespaceTreeView}
                    onCheckedChange={setNamespaceTreeView}
                  />
                </div>
                {namespaceTreeView && (
                  <div className="space-y-2">
                    <Label htmlFor="delimiter" className="text-sm">
                      Delimiter
                    </Label>
                    <Input
                      id="delimiter"
                      value={namespaceDelimiter}
                      onChange={(e) => setNamespaceDelimiter(e.target.value || '_')}
                      className="h-8"
                      placeholder="_"
                    />
                    <p className="text-xs text-muted-foreground">
                      Character used to split namespace paths
                    </p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors',
          isResizing && 'bg-primary/30'
        )}
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
        }}
      />
    </div>
  )
}
