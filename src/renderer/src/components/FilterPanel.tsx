import { useCallback, useMemo, ReactElement } from 'react'
import { ChevronDown, ChevronUp, Plus, X, Search } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { NamespaceSchema, FilterOperator } from '@renderer/api'

export interface FilterRow {
  id: string
  field: string
  operator: FilterOperator
  value: string
}

export interface FullTextSearch {
  field: string
  query: string
}

interface FilterPanelProps {
  schema: NamespaceSchema | undefined
  filters: FilterRow[]
  onFiltersChange: (filters: FilterRow[]) => void
  fullTextSearch: FullTextSearch | null
  onFullTextSearchChange: (search: FullTextSearch | null) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

// Operators available for each field type
const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  string: ['Eq', 'NotEq', 'In', 'NotIn', 'Glob', 'NotGlob'],
  int: ['Eq', 'NotEq', 'In', 'NotIn', 'Lt', 'Lte', 'Gt', 'Gte'],
  uint: ['Eq', 'NotEq', 'In', 'NotIn', 'Lt', 'Lte', 'Gt', 'Gte'],
  float: ['Eq', 'NotEq', 'Lt', 'Lte', 'Gt', 'Gte'],
  bool: ['Eq', 'NotEq']
}

// Human-readable operator labels
const OPERATOR_LABELS: Record<FilterOperator, string> = {
  Eq: '=',
  NotEq: '≠',
  In: 'in',
  NotIn: 'not in',
  Lt: '<',
  Lte: '≤',
  Gt: '>',
  Gte: '≥',
  Glob: 'matches',
  NotGlob: 'not matches'
}

// Get display label for a filter
function getFilterDisplayLabel(filter: FilterRow): string {
  const opLabel = OPERATOR_LABELS[filter.operator]
  const valueDisplay = filter.value.length > 20 ? filter.value.slice(0, 20) + '...' : filter.value
  return `${filter.field} ${opLabel} ${valueDisplay}`
}

// Generate unique ID for filter rows
let filterIdCounter = 0
function generateFilterId(): string {
  return `filter-${++filterIdCounter}-${Date.now()}`
}

export function FilterPanel({
  schema,
  filters,
  onFiltersChange,
  fullTextSearch,
  onFullTextSearchChange,
  isOpen,
  onOpenChange
}: FilterPanelProps): ReactElement {
  // Get filterable fields from schema (for standard filters)
  const filterableFields = useMemo(() => {
    const fields = schema
      ? Object.entries(schema)
          .filter(([, fieldSchema]) => {
            // Exclude vector fields
            if ('type' in fieldSchema && fieldSchema.type === 'vector') return false
            if (
              'type' in fieldSchema &&
              typeof fieldSchema.type === 'string' &&
              fieldSchema.type.startsWith('[')
            )
              return false
            // Only include explicitly filterable fields
            if ('filterable' in fieldSchema && fieldSchema.filterable === false) return false
            return true
          })
          .map(([fieldName, fieldSchema]) => ({
            name: fieldName,
            type: ('type' in fieldSchema ? fieldSchema.type : 'string') as string
          }))
      : []

    // Add ID field if not in schema (it's always filterable)
    if (!fields.find((f) => f.name === 'id')) {
      fields.unshift({ name: 'id', type: 'string' })
    }

    return fields
  }, [schema])

  // Get full-text search fields from schema
  const ftsFields = useMemo(() => {
    if (!schema) return []
    return Object.entries(schema)
      .filter(([, fieldSchema]) => {
        return 'full_text_search' in fieldSchema && fieldSchema.full_text_search
      })
      .map(([fieldName]) => fieldName)
  }, [schema])

  // Get operators for a field type
  const getOperatorsForField = useCallback(
    (fieldName: string): FilterOperator[] => {
      const field = filterableFields.find((f) => f.name === fieldName)
      const fieldType = field?.type || 'string'
      return OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE['string']
    },
    [filterableFields]
  )

  // Add a new filter row
  const addFilter = (): void => {
    const defaultField = filterableFields[0]?.name || 'id'
    const defaultOperators = getOperatorsForField(defaultField)
    onFiltersChange([
      ...filters,
      {
        id: generateFilterId(),
        field: defaultField,
        operator: defaultOperators[0],
        value: ''
      }
    ])
  }

  // Update a filter row
  const updateFilter = (id: string, updates: Partial<FilterRow>): void => {
    onFiltersChange(
      filters.map((filter) => {
        if (filter.id !== id) return filter

        const updated = { ...filter, ...updates }

        // If field changed, reset operator to first valid operator for new field type
        if (updates.field && updates.field !== filter.field) {
          const newOperators = getOperatorsForField(updates.field)
          if (!newOperators.includes(updated.operator)) {
            updated.operator = newOperators[0]
          }
        }

        return updated
      })
    )
  }

  // Remove a filter row
  const removeFilter = (id: string): void => {
    onFiltersChange(filters.filter((filter) => filter.id !== id))
  }

  // Clear all filters and search
  const clearAll = (): void => {
    onFiltersChange([])
    onFullTextSearchChange(null)
  }

  const activeFilterCount = filters.filter((f) => f.value.trim() !== '').length
  const hasActiveSearch = fullTextSearch && fullTextSearch.query.trim() !== ''
  const totalActiveCount = activeFilterCount + (hasActiveSearch ? 1 : 0)

  return (
    <div className="border rounded-lg bg-card mb-4">
      {/* Header - always visible */}
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">Filters</span>
          {totalActiveCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalActiveCount} active
            </Badge>
          )}
        </div>
        {totalActiveCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </button>

      {/* Collapsed state - show active filter/search badges */}
      {!isOpen && totalActiveCount > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {hasActiveSearch && (
            <Badge variant="outline" className="flex items-center gap-1 font-mono text-xs">
              <Search className="h-3 w-3" />
              {fullTextSearch.field}: &quot;{fullTextSearch.query.slice(0, 20)}
              {fullTextSearch.query.length > 20 ? '...' : ''}&quot;
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFullTextSearchChange(null)
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters
            .filter((f) => f.value.trim() !== '')
            .map((filter) => (
              <Badge
                key={filter.id}
                variant="outline"
                className="flex items-center gap-1 font-mono text-xs"
              >
                {getFilterDisplayLabel(filter)}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFilter(filter.id)
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}

      {/* Expanded state - show search and filter rows */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* Full-text search section */}
          {ftsFields.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Full-Text Search</label>
              <div className="flex items-center gap-2">
                <Select
                  value={fullTextSearch?.field || ftsFields[0]}
                  onValueChange={(field) =>
                    onFullTextSearchChange({
                      field,
                      query: fullTextSearch?.query || ''
                    })
                  }
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ftsFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={fullTextSearch?.query || ''}
                    onChange={(e) =>
                      onFullTextSearchChange({
                        field: fullTextSearch?.field || ftsFields[0],
                        query: e.target.value
                      })
                    }
                    placeholder="Search text..."
                    className="pl-8 h-8"
                  />
                </div>
                {hasActiveSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onFullTextSearchChange(null)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Results will be ranked by relevance when searching
              </p>
            </div>
          )}

          {/* Filters section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Attribute Filters</label>
            {filters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No filters applied. Add a filter to narrow down results.
              </p>
            ) : (
              <div className="space-y-2">
                {filters.map((filter) => (
                  <FilterRowComponent
                    key={filter.id}
                    filter={filter}
                    filterableFields={filterableFields}
                    operators={getOperatorsForField(filter.field)}
                    onUpdate={(updates) => updateFilter(filter.id, updates)}
                    onRemove={() => removeFilter(filter.id)}
                  />
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={addFilter} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface FilterRowComponentProps {
  filter: FilterRow
  filterableFields: { name: string; type: string }[]
  operators: FilterOperator[]
  onUpdate: (updates: Partial<FilterRow>) => void
  onRemove: () => void
}

function FilterRowComponent({
  filter,
  filterableFields,
  operators,
  onUpdate,
  onRemove
}: FilterRowComponentProps): ReactElement {
  return (
    <div className="flex items-center gap-2">
      {/* Field selector */}
      <Select value={filter.field} onValueChange={(value) => onUpdate({ field: value })}>
        <SelectTrigger className="w-40 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {filterableFields.map((field) => (
            <SelectItem key={field.name} value={field.name}>
              {field.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={filter.operator}
        onValueChange={(value) => onUpdate({ operator: value as FilterOperator })}
      >
        <SelectTrigger className="w-28 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      <Input
        value={filter.value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        placeholder={getPlaceholder(filter.operator)}
        className="flex-1 h-8"
      />

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

function getPlaceholder(operator: FilterOperator): string {
  if (operator === 'In' || operator === 'NotIn') {
    return 'value1, value2, ...'
  }
  if (operator === 'Glob' || operator === 'NotGlob') {
    return 'pattern (e.g., *test*)'
  }
  return 'value'
}
