import { useParams, Link } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Database,
  FileJson,
  Table,
  LayoutGrid,
  RefreshCw,
  Download,
  Copy,
  Check
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Separator } from '@renderer/components/ui/separator'
import { ScrollArea, ScrollBar } from '@renderer/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { useNamespaceMetadata, useQueryDocuments } from '@renderer/api'
import { usePreferencesStore } from '@renderer/stores'
import { cn, formatBytes, formatNumber, formatDate } from '@renderer/lib/utils'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200]

export function NamespacePage() {
  const { namespaceId: encodedNamespaceId } = useParams<{ namespaceId: string }>()
  // Decode the namespace ID from URL (it may contain special characters)
  const namespaceId = encodedNamespaceId ? decodeURIComponent(encodedNamespaceId) : undefined
  const [copiedSchema, setCopiedSchema] = useState(false)
  const { defaultViewMode, addRecentNamespace } = usePreferencesStore()
  const [viewMode, setViewMode] = useState<'table' | 'json' | 'card'>(defaultViewMode)

  // Pagination state - using filter-based pagination (id > lastId)
  const [pageSize, setPageSize] = useState(50)
  const [afterId, setAfterId] = useState<string | number | undefined>(undefined)
  const [pageHistory, setPageHistory] = useState<(string | number | undefined)[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const {
    data: metadata,
    isLoading: isLoadingMetadata,
    error: metadataError,
    refetch: refetchMetadata,
    isRefetching: isRefetchingMetadata
  } = useNamespaceMetadata(namespaceId || '')

  // Build query with pagination filter
  // Turbopuffer filter format: ["field", "Operator", value] (single expression, not array)
  const queryRequest = {
    rank_by: ['id', 'asc'] as [string, 'asc' | 'desc'],
    limit: pageSize,
    include_attributes: true as const,
    ...(afterId !== undefined
      ? { filters: ['id', 'Gt', afterId] as [string, 'Gt', string | number] }
      : {})
  }

  // Query documents with pagination
  const {
    data: documentsData,
    isLoading: isLoadingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
    isRefetching: isRefetchingDocuments
  } = useQueryDocuments(namespaceId || '', queryRequest, !!namespaceId)

  // Get the last ID from current results for "next page"
  const lastId = documentsData?.rows.length
    ? documentsData.rows[documentsData.rows.length - 1].id
    : undefined

  // Check if there might be more results (if we got a full page)
  const hasMoreResults = documentsData?.rows.length === pageSize

  // Reset pagination when namespace changes
  useEffect(() => {
    setAfterId(undefined)
    setPageHistory([])
    setCurrentPage(1)
  }, [namespaceId])

  // Reset pagination when page size changes
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize))
    setAfterId(undefined)
    setPageHistory([])
    setCurrentPage(1)
  }

  // Navigate to next page
  const goToNextPage = () => {
    if (lastId !== undefined && hasMoreResults) {
      setPageHistory((prev) => [...prev, afterId])
      setAfterId(lastId)
      setCurrentPage((prev) => prev + 1)
    }
  }

  // Navigate to previous page
  const goToPrevPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory]
      const prevAfterId = newHistory.pop()
      setPageHistory(newHistory)
      setAfterId(prevAfterId)
      setCurrentPage((prev) => prev - 1)
    }
  }

  // Go to first page
  const goToFirstPage = () => {
    setAfterId(undefined)
    setPageHistory([])
    setCurrentPage(1)
  }

  // Log errors and responses for debugging
  if (metadataError) {
    console.error('Metadata error:', metadataError)
  }
  if (documentsError) {
    console.error('Documents error:', documentsError)
  }
  // Debug: log the full documents response to see pagination info
  if (documentsData) {
    console.log('Documents response:', documentsData)
  }

  // Add to recent when loaded (only once per namespace)
  const addedToRecentRef = useRef<string | null>(null)
  useEffect(() => {
    if (namespaceId && metadata && addedToRecentRef.current !== namespaceId) {
      addedToRecentRef.current = namespaceId
      addRecentNamespace(namespaceId)
    }
  }, [namespaceId, metadata, addRecentNamespace])

  const copySchema = () => {
    if (metadata?.schema) {
      navigator.clipboard.writeText(JSON.stringify(metadata.schema, null, 2))
      setCopiedSchema(true)
      setTimeout(() => setCopiedSchema(false), 2000)
    }
  }

  const exportDocuments = () => {
    if (!documentsData?.rows.length) return

    const dataStr = JSON.stringify(documentsData.rows, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${namespaceId}-documents-page${currentPage}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!namespaceId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No namespace selected</p>
      </div>
    )
  }

  // Show error state if metadata fetch failed
  if (metadataError && !isLoadingMetadata) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Database className="h-12 w-12 text-destructive/50 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Failed to load namespace</h2>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          {metadataError instanceof Error ? metadataError.message : 'Unknown error occurred'}
        </p>
        <Button onClick={() => refetchMetadata()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-2 border-b text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <Database className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium truncate">{namespaceId}</span>
      </div>

      {/* Header */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">{namespaceId}</h1>
            {isLoadingMetadata ? (
              <Skeleton className="h-4 w-48" />
            ) : metadata ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{formatNumber(metadata.approx_row_count)} documents</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{formatBytes(metadata.approx_logical_bytes)}</span>
                <Separator orientation="vertical" className="h-4" />
                <Badge
                  variant={metadata.index?.status === 'up-to-date' ? 'success' : 'warning'}
                  className="text-xs"
                >
                  {metadata.index?.status === 'up-to-date' ? 'Indexed' : 'Indexing...'}
                </Badge>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchMetadata()
                refetchDocuments()
              }}
              disabled={isRefetchingMetadata || isRefetchingDocuments}
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4 mr-2',
                  (isRefetchingMetadata || isRefetchingDocuments) && 'animate-spin'
                )}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="documents" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 border-b">
          <TabsList className="h-10">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents" className="flex-1 overflow-hidden m-0 p-4">
          <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Page size:</span>
                  <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-sm text-muted-foreground">
                  {documentsData?.rows.length || 0} documents on page {currentPage}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Pagination controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToFirstPage}
                    disabled={currentPage === 1 || isLoadingDocuments}
                    className="h-8 px-2"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevPage}
                    disabled={currentPage === 1 || isLoadingDocuments}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 min-w-[3rem] text-center">
                    {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={!hasMoreResults || isLoadingDocuments}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-r-none"
                    onClick={() => setViewMode('table')}
                  >
                    <Table className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'json' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none border-x"
                    onClick={() => setViewMode('json')}
                  >
                    <FileJson className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-l-none"
                    onClick={() => setViewMode('card')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportDocuments}
                  disabled={!documentsData?.rows.length}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Document List */}
            <ScrollArea className="flex-1 border rounded-lg">
              {isLoadingDocuments ? (
                <div className="p-4 space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !documentsData?.rows.length ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No documents found</p>
                </div>
              ) : viewMode === 'json' ? (
                <pre className="p-4 text-sm font-mono overflow-auto">
                  {JSON.stringify(
                    documentsData.rows.map((row) => {
                      // Collapse vectors by default - show placeholder
                      const collapsed: Record<string, unknown> = {}
                      for (const [key, value] of Object.entries(row)) {
                        if (Array.isArray(value) && value.length > 10 && typeof value[0] === 'number') {
                          collapsed[key] = `[Vector: ${value.length} dimensions]`
                        } else {
                          collapsed[key] = value
                        }
                      }
                      return collapsed
                    }),
                    null,
                    2
                  )}
                </pre>
              ) : viewMode === 'card' ? (
                <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {documentsData.rows.map((row, index) => (
                    <Card key={row.id?.toString() || index} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono truncate">
                          {row.id?.toString()}
                        </CardTitle>
                        {row.$dist !== undefined && (
                          <CardDescription>Distance: {row.$dist.toFixed(4)}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(
                            Object.fromEntries(
                              Object.entries(row).filter(
                                ([k]) => !['id', '$dist', 'vector'].includes(k)
                              )
                            ),
                            null,
                            2
                          )}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (() => {
                // Extract all unique attribute keys (excluding system fields)
                const systemFields = ['id', '$dist', 'vector']
                const attrKeys = Array.from(
                  new Set(
                    documentsData.rows.flatMap((row) =>
                      Object.keys(row).filter((k) => !systemFields.includes(k))
                    )
                  )
                ).sort()
                const hasDistance = documentsData.rows[0]?.$dist !== undefined

                return (
                  <table className="w-max min-w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium whitespace-nowrap">ID</th>
                        {hasDistance && (
                          <th className="text-left p-3 font-medium whitespace-nowrap">Distance</th>
                        )}
                        {attrKeys.map((key) => (
                          <th key={key} className="text-left p-3 font-medium whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {documentsData.rows.map((row, index) => (
                        <tr key={row.id?.toString() || index} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs whitespace-nowrap">
                            {row.id?.toString()}
                          </td>
                          {hasDistance && (
                            <td className="p-3 font-mono text-xs whitespace-nowrap">
                              {row.$dist?.toFixed(4)}
                            </td>
                          )}
                          {attrKeys.map((key) => {
                            const value = row[key]
                            let display: string
                            if (value === undefined || value === null) {
                              display = '—'
                            } else if (Array.isArray(value)) {
                              display = `[${value.length} items]`
                            } else if (typeof value === 'object') {
                              display = JSON.stringify(value)
                            } else {
                              display = String(value)
                            }
                            return (
                              <td
                                key={key}
                                className="p-3 font-mono text-xs max-w-xs truncate"
                                title={typeof value === 'string' ? value : JSON.stringify(value)}
                              >
                                {display}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="schema" className="flex-1 overflow-hidden m-0 p-4">
          {isLoadingMetadata ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : metadata?.schema ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Field Definitions</h3>
                <Button variant="outline" size="sm" onClick={copySchema}>
                  {copiedSchema ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Schema
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="flex-1 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Field</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Properties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metadata.schema).map(([field, schemaValue]) => {
                      // Cast to record type since API may return unexpected structures
                      const schema = schemaValue as unknown as Record<string, unknown>

                      // Helper to safely stringify any value
                      const stringify = (val: unknown): string => {
                        if (val == null) return ''
                        if (typeof val === 'object') return JSON.stringify(val)
                        return String(val)
                      }

                      const typeStr = stringify(schema.type) || 'unknown'
                      const dimensions = typeof schema.dimensions === 'number' ? schema.dimensions : null
                      const filterable = !!schema.filterable
                      const fullTextSearch = !!schema.full_text_search
                      const distanceMetric = schema.distance_metric ? stringify(schema.distance_metric) : null

                      return (
                      <tr key={field} className="border-t">
                        <td className="p-3 font-mono">{field}</td>
                        <td className="p-3">
                          <Badge variant="outline">{typeStr}</Badge>
                          {dimensions !== null && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              ({dimensions}d)
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {filterable && (
                              <Badge variant="secondary" className="text-xs">
                                filterable
                              </Badge>
                            )}
                            {fullTextSearch && (
                              <Badge variant="secondary" className="text-xs">
                                FTS
                              </Badge>
                            )}
                            {distanceMetric && (
                              <Badge variant="secondary" className="text-xs">
                                {distanceMetric}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-muted-foreground">No schema available</p>
          )}
        </TabsContent>

        <TabsContent value="stats" className="flex-1 overflow-auto m-0 p-4">
          {isLoadingMetadata ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : metadata ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Documents</CardDescription>
                    <CardTitle className="text-2xl">
                      {formatNumber(metadata.approx_row_count)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Storage Size</CardDescription>
                    <CardTitle className="text-2xl">
                      {formatBytes(metadata.approx_logical_bytes)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Index Status</CardDescription>
                    <CardTitle className="text-2xl capitalize">
                      {metadata.index?.status?.replace('-', ' ') || 'Unknown'}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Encryption</CardDescription>
                    <CardTitle className="text-2xl capitalize">
                      {'sse' in metadata.encryption ? 'SSE' : 'cmek' in metadata.encryption ? 'CMEK' : 'Unknown'}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Timestamps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-mono text-sm">{formatDate(metadata.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="font-mono text-sm">{formatDate(metadata.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground">No statistics available</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
