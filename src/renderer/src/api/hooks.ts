import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  NamespaceListResponse,
  NamespaceMetadata,
  QueryRequest,
  QueryResponse,
  ConnectionTestResult
} from './types'
import { useConnectionStore } from '@renderer/stores'

const DEFAULT_BASE_URL = 'https://api.turbopuffer.com'

// Query keys factory
export const queryKeys = {
  namespaces: (prefix?: string) => ['namespaces', { prefix }] as const,
  namespace: (id: string) => ['namespace', id] as const,
  namespaceMetadata: (id: string) => ['namespace', id, 'metadata'] as const,
  query: (namespace: string, query: QueryRequest) => ['query', namespace, query] as const
}

// Hook to get API credentials
function useApiCredentials() {
  const getActiveProfile = useConnectionStore((state) => state.getActiveProfile)
  const profile = getActiveProfile()

  return {
    apiKey: profile?.apiKey || '',
    baseUrl: profile?.baseUrl || DEFAULT_BASE_URL,
    isConfigured: !!profile?.apiKey
  }
}

// List namespaces with pagination
export function useNamespaces(prefix?: string) {
  const { apiKey, baseUrl, isConfigured } = useApiCredentials()

  return useInfiniteQuery({
    queryKey: queryKeys.namespaces(prefix),
    queryFn: async ({ pageParam }) => {
      const result = await window.api.listNamespaces({
        apiKey,
        baseUrl,
        cursor: pageParam,
        prefix,
        pageSize: 100
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to list namespaces')
      }

      return result.data as NamespaceListResponse
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: isConfigured
  })
}

// Get namespace metadata
export function useNamespaceMetadata(namespaceId: string) {
  const { apiKey, baseUrl, isConfigured } = useApiCredentials()

  return useQuery({
    queryKey: queryKeys.namespaceMetadata(namespaceId),
    queryFn: async () => {
      const result = await window.api.getNamespaceMetadata({
        apiKey,
        baseUrl,
        namespaceId
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to get namespace metadata')
      }

      return result.data as NamespaceMetadata
    },
    enabled: isConfigured && !!namespaceId
  })
}

// Query documents
export function useQueryDocuments(namespaceId: string, query: QueryRequest, enabled = true) {
  const { apiKey, baseUrl, isConfigured } = useApiCredentials()

  return useQuery({
    queryKey: queryKeys.query(namespaceId, query),
    queryFn: async () => {
      const result = await window.api.query({
        apiKey,
        baseUrl,
        namespaceId,
        query
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to query documents')
      }

      return result.data as QueryResponse
    },
    enabled: isConfigured && !!namespaceId && enabled
  })
}

// Test connection
export function useTestConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      apiKey,
      baseUrl = DEFAULT_BASE_URL
    }: {
      apiKey: string
      baseUrl?: string
    }): Promise<ConnectionTestResult> => {
      const result = await window.api.testConnection({ apiKey, baseUrl })

      if (result.success) {
        return {
          success: true,
          latency: result.latency,
          namespaceCount: (result.data as NamespaceListResponse)?.namespaces?.length
        }
      } else {
        return {
          success: false,
          latency: result.latency,
          error: result.error || 'Connection failed'
        }
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['namespaces'] })
      }
    }
  })
}

// Prefetch namespace metadata
export function usePrefetchNamespaceMetadata() {
  const queryClient = useQueryClient()
  const { apiKey, baseUrl, isConfigured } = useApiCredentials()

  return (namespaceId: string) => {
    if (!isConfigured) return

    queryClient.prefetchQuery({
      queryKey: queryKeys.namespaceMetadata(namespaceId),
      queryFn: async () => {
        const result = await window.api.getNamespaceMetadata({
          apiKey,
          baseUrl,
          namespaceId
        })

        if (!result.success) {
          throw new Error(result.error || 'Failed to get namespace metadata')
        }

        return result.data as NamespaceMetadata
      }
    })
  }
}
