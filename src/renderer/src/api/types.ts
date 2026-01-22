// Turbopuffer API Types

export interface NamespaceListItem {
  id: string
}

export interface NamespaceListResponse {
  namespaces: NamespaceListItem[]
  next_cursor?: string
}

export interface FieldSchema {
  type: string
  filterable?: boolean
  full_text_search?: boolean
  bm25?: {
    language: string
    stemming: boolean
    case_sensitive: boolean
    k1: number
    b: number
  }
}

export interface VectorSchema {
  type: 'vector'
  dimensions: number
  distance_metric?: 'cosine_distance' | 'euclidean_squared'
}

export interface NamespaceSchema {
  [key: string]: FieldSchema | VectorSchema
}

export interface NamespaceMetadata {
  id: string
  schema: NamespaceSchema
  approx_logical_bytes: number
  approx_row_count: number
  created_at: string
  updated_at: string
  index: {
    status: 'up-to-date' | 'updating'
    unindexed_bytes?: number
  }
  encryption: { sse: true } | { cmek: { key_name: string } }
}

// Query Types
export type FilterOperator =
  | 'Eq'
  | 'NotEq'
  | 'In'
  | 'NotIn'
  | 'Lt'
  | 'Lte'
  | 'Gt'
  | 'Gte'
  | 'Glob'
  | 'NotGlob'

// Simple filter: ["field", "Operator", value]
export type SimpleFilter = [string, FilterOperator, string | number | boolean | (string | number)[]]

// Logical operators: ["And", ...filters] or ["Or", ...filters]
export type LogicalFilter = ['And' | 'Or', ...Filter[]]

export type Filter = SimpleFilter | LogicalFilter

export interface VectorRankBy {
  vector: number[]
  distance_metric?: 'cosine_distance' | 'euclidean_squared'
}

export interface BM25Options {
  last_as_prefix?: boolean
}

// Rank by attribute: [attributeName, 'asc' | 'desc']
// Rank by vector: ['vector', { vector: number[], distance_metric?: string }]
// Rank by BM25: [field_name, 'BM25', query] or [field_name, 'BM25', query, { last_as_prefix: true }]
export type RankBy =
  | [string, 'asc' | 'desc']
  | ['vector', VectorRankBy]
  | [string, 'BM25', string]
  | [string, 'BM25', string, BM25Options]

export interface QueryRequest {
  rank_by?: RankBy
  top_k?: number // For vector/BM25 queries
  limit?: number // For attribute-based ordering
  filters?: Filter // Single filter expression (can be simple or logical)
  include_attributes?: string[] | true // true = all attributes, or list specific ones
  exclude_attributes?: string[]
  include_vectors?: boolean
  consistency?: 'strong' | 'eventual'
}

export interface QueryResultRow {
  id: string | number
  $dist?: number
  vector?: number[]
  [key: string]: unknown
}

export interface QueryResponse {
  rows: QueryResultRow[]
  next_cursor?: string
  billing?: {
    logical_bytes: number
    rows_returned: number
  }
  performance?: {
    cache_status: 'hit' | 'miss'
    query_execution_ms?: number
  }
}

// Connection testing
export interface ConnectionTestResult {
  success: boolean
  latency: number
  error?: string
  namespaceCount?: number
}

// API error
export interface APIError {
  status: string
  error: string
}
