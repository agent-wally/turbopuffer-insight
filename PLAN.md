# Turbopuffer Insight - Namespace Viewer Plan

## Executive Summary

Turbopuffer Insight is a read-only desktop application for browsing, exploring, and analyzing Turbopuffer vector database namespaces. Built with Electron + React + Vite, it provides a professional-grade GUI similar to MongoDB Compass and Redis Insight.

---

## 1. Research Summary

### 1.1 Turbopuffer Overview

Turbopuffer is a serverless vector and full-text search engine with:
- **Namespaces**: Logical containers for organizing vector/document data
- **Documents**: Records with IDs, optional vectors (up to 10,752 dimensions), and attributes
- **Query Types**: Vector search (ANN), exact kNN, full-text search (BM25), attribute ordering
- **Data Types**: Strings, integers, floats, UUIDs, datetimes, booleans, arrays
- **Performance**: Sub-10ms cached queries, 10k+ writes/s, 1k+ QPS per namespace

### 1.2 API Capabilities (Read-Only Relevant)

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/namespaces` | List all namespaces with pagination |
| `GET /v1/namespaces/:ns/metadata` | Get namespace schema and stats |
| `POST /v2/namespaces/:ns/query` | Query/search documents |
| `GET /v1/namespaces/:ns/cache_warm` | Warm cache for performance |
| `POST /v1/namespaces/:ns/_debug/recall` | Evaluate search recall |

### 1.3 Competitor Analysis

#### MongoDB Compass Features
- Sidebar navigation with database/collection tree
- Document list view with expandable JSON
- Visual query builder with drag-and-drop
- Schema analysis with field type visualization
- Index management with performance indicators
- Aggregation pipeline builder
- Explain plan visualization
- Import/Export (JSON, CSV)
- Real-time performance metrics
- Dark/Light theme support
- Connection manager with favorites

#### Redis Insight Features
- Top navigation with Browser/Workbench/CLI tabs
- Key browser with type icons and namespace grouping
- Multiple formatters (JSON, HEX, ASCII, MessagePack)
- Bulk operations panel
- Stream visualization with consumer groups
- Database analysis (memory, type distribution)
- Profiler and SlowLog tools
- AI Copilot for query assistance
- Plugin extensibility

---

## 2. Feature Specification

### 2.1 Core Features (MVP)

#### Connection Management
- [ ] API key input with secure storage (Electron safeStorage)
- [ ] Multiple connection profiles (dev, staging, production)
- [ ] Connection testing with latency display
- [ ] Auto-reconnect on failure
- [ ] Base URL configuration (for future self-hosted support)

#### Namespace Browser
- [ ] List all namespaces with pagination
- [ ] Search/filter namespaces by prefix
- [ ] Display namespace metadata:
  - Name
  - Approximate row count
  - Approximate logical bytes (human-readable)
  - Created/Updated timestamps
  - Index status (up-to-date / updating)
  - Encryption status
- [ ] Sort namespaces by name, size, row count, date
- [ ] Namespace favorites/pinning
- [ ] Refresh namespace list

#### Schema Inspector
- [ ] Display full schema definition
- [ ] Field list with:
  - Field name
  - Data type
  - Filterable status
  - Full-text search enabled
- [ ] Vector configuration:
  - Dimensions
  - Vector type (f32/f16)
  - Distance metric
- [ ] Copy schema as JSON

#### Document Browser
- [ ] Paginated document list (configurable page size)
- [ ] Multiple view modes:
  - Table view (spreadsheet-like)
  - JSON view (expandable tree)
  - Card view (one doc per card)
- [ ] Column visibility toggle
- [ ] Column reordering (drag-and-drop)
- [ ] Sort by any attribute
- [ ] Document detail panel (slide-out or modal)
- [ ] Copy document as JSON
- [ ] Vector visualization (sparkline or mini-chart)

#### Query Builder
- [ ] Visual filter builder:
  - Field selector (autocomplete from schema)
  - Operator selector (Eq, Lt, Gt, In, Glob, etc.)
  - Value input with type validation
  - AND/OR grouping with nesting
- [ ] Query type selector:
  - Vector search (with vector input)
  - Full-text search (BM25)
  - Attribute ordering
  - Exact kNN
- [ ] Top-K limit slider (1-10,000)
- [ ] Include attributes selector
- [ ] Raw JSON query editor (toggle)
- [ ] Query history with replay
- [ ] Save queries as favorites

#### Vector Search
- [ ] Vector input methods:
  - Paste raw array
  - Upload from file
  - Enter comma-separated values
  - Find similar (select existing document)
- [ ] Distance metric display
- [ ] Result ranking with $dist scores
- [ ] Visual similarity indicator (color gradient)

### 2.2 Enhanced Features (Phase 2)

#### Data Analysis
- [ ] Namespace statistics dashboard:
  - Document count over time
  - Storage usage graph
  - Query performance metrics
- [ ] Field value distribution charts
- [ ] Vector dimension analysis (PCA/t-SNE visualization)
- [ ] Data type breakdown pie chart

#### Export Capabilities
- [ ] Export query results:
  - JSON (pretty or compact)
  - CSV
  - JSONL (newline-delimited)
- [ ] Export all documents (background task with progress)
- [ ] Export schema definition

#### Search & Discovery
- [ ] Global search across namespaces
- [ ] Full-text search with highlighting
- [ ] Regex pattern matching on attributes
- [ ] Bookmark documents for quick access

#### Performance Tools
- [ ] Query explain/timing display
- [ ] Cache status indicator (hit/miss)
- [ ] Recall evaluation tool (debug endpoint)
- [ ] Request/response size display

### 2.3 Advanced Features (Phase 3)

#### Multi-Query Support
- [ ] Run up to 16 parallel queries
- [ ] Compare results side-by-side
- [ ] Combine vector + full-text search

#### Aggregations
- [ ] Count aggregations with grouping
- [ ] Sum aggregations
- [ ] Visual aggregation builder
- [ ] Results as charts

#### Collaboration
- [ ] Share query via URL/deeplink
- [ ] Export query as cURL command
- [ ] Export query as Python/JS code snippet

#### Accessibility & UX
- [ ] Keyboard shortcuts (Cmd/Ctrl+K for command palette)
- [ ] Dark/Light/System theme
- [ ] Customizable font size
- [ ] Screen reader support

---

## 3. UI/UX Design

### 3.1 Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Turbopuffer Insight    [Connection: prod ▼] [⚙️] [🌙]   │
├────────────┬────────────────────────────────────────────────────┤
│            │  Breadcrumb: Namespaces > my-namespace > Documents │
│  SIDEBAR   ├────────────────────────────────────────────────────┤
│            │                                                    │
│  ⬇ prod    │  ┌─────────────────────────────────────────────┐  │
│    📦 ns-1 │  │  [🔍 Filter] [View: Table ▼] [Columns ▼]    │  │
│    📦 ns-2 │  ├─────────────────────────────────────────────┤  │
│  ► staging │  │  ID        │ vector │ title    │ score     │  │
│            │  │  doc-001   │ [···]  │ Hello    │ 0.95      │  │
│  [+ Add]   │  │  doc-002   │ [···]  │ World    │ 0.87      │  │
│            │  │  doc-003   │ [···]  │ Test     │ 0.82      │  │
│            │  ├─────────────────────────────────────────────┤  │
│            │  │  ◀ 1 2 3 ... 100 ▶   [50/page ▼]            │  │
│            │  └─────────────────────────────────────────────┘  │
│            │                                                    │
├────────────┴────────────────────────────────────────────────────┤
│  Query Builder  │  Schema  │  Stats  │  History                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ rank_by: [Vector Search ▼]  top_k: [100]                 │   │
│  │ ┌─ Filters ─────────────────────────────────────────┐    │   │
│  │ │ [category] [Eq ▼] [technology]              [+ ─] │    │   │
│  │ │ [score]    [Gt ▼] [0.5]                     [+ ─] │    │   │
│  │ └───────────────────────────────────────────────────┘    │   │
│  │                                    [Clear] [Run Query]   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Navigation Flow

1. **Home/Welcome** → Connection setup or recent connections
2. **Namespace List** → Browse all namespaces
3. **Namespace Detail** → Tabs: Documents | Schema | Stats | Queries
4. **Document Detail** → Full document view with vector visualization

### 3.3 Component Library

Using a consistent design system:
- **Colors**: Turbopuffer brand colors + semantic colors
- **Typography**: Monospace for data, sans-serif for UI
- **Icons**: Lucide React (consistent, MIT licensed)
- **Components**:
  - shadcn/ui (Radix-based, highly customizable)
  - Or Mantine (more batteries-included)
  - TanStack Table for data grids

### 3.4 Responsive Behavior

- Minimum window size: 900x600px
- Collapsible sidebar for more content space
- Resizable panels (sidebar, query builder)
- Keyboard-first navigation support

---

## 4. Technical Architecture

### 4.1 Project Structure

```
src/
├── main/                     # Electron main process
│   ├── index.ts              # App entry, window management
│   ├── ipc/                  # IPC handlers
│   │   ├── api.ts            # Turbopuffer API calls
│   │   ├── storage.ts        # Secure credential storage
│   │   └── export.ts         # Export functionality
│   └── menu.ts               # Application menu
├── preload/
│   ├── index.ts              # Context bridge
│   └── api.d.ts              # Type definitions
└── renderer/
    └── src/
        ├── main.tsx          # React entry
        ├── App.tsx           # Root component + routing
        ├── api/              # API client layer
        │   ├── client.ts     # Turbopuffer client wrapper
        │   ├── types.ts      # API types
        │   └── hooks.ts      # React Query hooks
        ├── components/
        │   ├── ui/           # Base UI components
        │   ├── layout/       # Layout components
        │   │   ├── Sidebar.tsx
        │   │   ├── Header.tsx
        │   │   └── Panel.tsx
        │   ├── connection/   # Connection management
        │   ├── namespace/    # Namespace components
        │   ├── document/     # Document viewing
        │   ├── query/        # Query builder
        │   └── schema/       # Schema inspector
        ├── pages/
        │   ├── Home.tsx
        │   ├── Namespaces.tsx
        │   ├── NamespaceDetail.tsx
        │   └── Settings.tsx
        ├── stores/           # State management (Zustand)
        │   ├── connection.ts
        │   ├── query.ts
        │   └── preferences.ts
        ├── hooks/            # Custom React hooks
        ├── utils/            # Utility functions
        │   ├── format.ts     # Data formatting
        │   ├── vector.ts     # Vector utilities
        │   └── export.ts     # Export helpers
        └── styles/           # Global styles + themes
```

### 4.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Desktop | Electron 39 | Cross-platform, already set up |
| UI Framework | React 19 | Already set up, excellent ecosystem |
| Build Tool | Vite 7 | Already set up, fast HMR |
| Routing | React Router 7 | Standard, well-documented |
| State | Zustand | Simple, performant, no boilerplate |
| Server State | TanStack Query | Caching, pagination, background refresh |
| Styling | Tailwind CSS | Utility-first, fast development |
| Components | shadcn/ui | Accessible, customizable, Tailwind-native |
| Data Grid | TanStack Table | Headless, powerful, virtualization |
| Icons | Lucide React | Consistent, MIT, large set |
| Forms | React Hook Form + Zod | Validation, performance |
| Charts | Recharts or Visx | Visualization needs |

### 4.3 IPC Communication Design

```typescript
// Main process handlers
ipcMain.handle('api:listNamespaces', async (_, { cursor, prefix, pageSize }) => {
  return turbopufferClient.listNamespaces({ cursor, prefix, pageSize });
});

ipcMain.handle('api:getNamespaceMetadata', async (_, { namespace }) => {
  return turbopufferClient.getMetadata(namespace);
});

ipcMain.handle('api:query', async (_, { namespace, query }) => {
  return turbopufferClient.query(namespace, query);
});

ipcMain.handle('storage:setApiKey', async (_, { profile, apiKey }) => {
  return safeStorage.encryptString(apiKey);
});
```

### 4.4 API Client Design

```typescript
interface TurbopufferClient {
  // Namespace operations
  listNamespaces(params: ListParams): Promise<NamespaceList>;
  getMetadata(namespace: string): Promise<NamespaceMetadata>;

  // Query operations
  query(namespace: string, query: Query): Promise<QueryResult>;

  // Utility
  testConnection(): Promise<ConnectionStatus>;
  warmCache(namespace: string): Promise<void>;
  evaluateRecall(namespace: string, params: RecallParams): Promise<RecallResult>;
}
```

### 4.5 State Management

```typescript
// Connection store
interface ConnectionState {
  profiles: ConnectionProfile[];
  activeProfile: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

// Query store
interface QueryState {
  currentQuery: Query | null;
  history: QueryHistoryItem[];
  savedQueries: SavedQuery[];
  results: QueryResult | null;
}

// Preferences store
interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  defaultPageSize: number;
  defaultViewMode: 'table' | 'json' | 'card';
  sidebarCollapsed: boolean;
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Basic working application with namespace browsing

1. **Setup & Configuration**
   - [ ] Install dependencies (Tailwind, shadcn/ui, React Router, Zustand, TanStack Query)
   - [ ] Configure Tailwind with custom theme
   - [ ] Set up shadcn/ui components
   - [ ] Configure routing structure
   - [ ] Set up IPC architecture

2. **Connection Management**
   - [ ] API key input form
   - [ ] Secure storage with Electron safeStorage
   - [ ] Connection testing
   - [ ] Profile management (CRUD)

3. **Basic Layout**
   - [ ] App shell with header and sidebar
   - [ ] Navigation between pages
   - [ ] Theme toggle (dark/light)

4. **Namespace List**
   - [ ] Fetch and display namespaces
   - [ ] Pagination with cursor
   - [ ] Search by prefix
   - [ ] Sorting options

### Phase 2: Core Features (Week 3-4)

**Goal**: Full document browsing and basic querying

5. **Namespace Detail View**
   - [ ] Metadata display
   - [ ] Schema inspector
   - [ ] Tab navigation

6. **Document Browser**
   - [ ] Table view with TanStack Table
   - [ ] Pagination controls
   - [ ] Column visibility/reordering
   - [ ] Document detail modal

7. **Basic Query Builder**
   - [ ] Filter builder UI
   - [ ] Operator selection
   - [ ] Run query and display results
   - [ ] Raw JSON mode

### Phase 3: Advanced Querying (Week 5-6)

**Goal**: Full query capabilities including vector search

8. **Vector Search**
   - [ ] Vector input methods
   - [ ] Distance display
   - [ ] Find similar document

9. **Full-Text Search**
   - [ ] BM25 query input
   - [ ] Result highlighting

10. **Query Management**
    - [ ] Query history
    - [ ] Save/load queries
    - [ ] Copy as JSON/cURL

### Phase 4: Polish & Enhancement (Week 7-8)

**Goal**: Production-ready application

11. **Export Features**
    - [ ] Export results (JSON, CSV, JSONL)
    - [ ] Export schema

12. **Performance & UX**
    - [ ] Keyboard shortcuts
    - [ ] Command palette
    - [ ] Loading states and skeletons
    - [ ] Error handling and toasts

13. **Analytics Views**
    - [ ] Namespace statistics
    - [ ] Visual charts

14. **Final Polish**
    - [ ] App icons and branding
    - [ ] Auto-updater configuration
    - [ ] Build and package for all platforms

---

## 6. Feature Comparison Matrix

| Feature | MongoDB Compass | Redis Insight | Turbopuffer Insight |
|---------|----------------|---------------|---------------------|
| **Connection Management** |
| Multiple profiles | ✅ | ✅ | ✅ Planned |
| Secure credential storage | ✅ | ✅ | ✅ Planned |
| Connection testing | ✅ | ✅ | ✅ Planned |
| **Data Browsing** |
| Collection/Namespace list | ✅ | ✅ | ✅ Planned |
| Document/Key browser | ✅ | ✅ | ✅ Planned |
| Multiple view modes | ✅ Grid/List/JSON | ✅ List/Tree | ✅ Table/JSON/Card |
| Pagination | ✅ | ✅ | ✅ Planned |
| **Schema** |
| Schema visualization | ✅ | ❌ | ✅ Planned |
| Field type display | ✅ | ✅ (key type) | ✅ Planned |
| **Querying** |
| Visual query builder | ✅ | ❌ | ✅ Planned |
| Raw query editor | ✅ | ✅ CLI | ✅ Planned |
| Query history | ✅ | ✅ | ✅ Planned |
| Saved queries | ✅ | ✅ | ✅ Planned |
| **Vector-Specific** |
| Vector search | ❌ (Atlas Search) | ❌ | ✅ Planned (Core) |
| Vector visualization | ❌ | ❌ | ✅ Planned |
| Similarity scoring | ❌ | ❌ | ✅ Planned |
| **Full-Text Search** |
| BM25/Keyword search | ❌ (Atlas Search) | ✅ (RediSearch) | ✅ Planned |
| **Analytics** |
| Performance metrics | ✅ | ✅ Profiler | ⚠️ Limited (API) |
| Storage statistics | ✅ | ✅ | ✅ Planned |
| Index management | ✅ | ❌ | ❌ (Not exposed) |
| **Export** |
| JSON export | ✅ | ❌ | ✅ Planned |
| CSV export | ✅ | ❌ | ✅ Planned |
| **AI Features** |
| Natural language queries | ✅ | ✅ Copilot | ❌ Future |
| **UX** |
| Dark mode | ✅ | ✅ | ✅ Planned |
| Keyboard shortcuts | ✅ | ✅ | ✅ Planned |
| Command palette | ❌ | ❌ | ✅ Planned |

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API rate limits | Medium | Low | Implement request throttling, caching |
| Large namespace handling | High | Medium | Virtual scrolling, progressive loading |
| Vector data size | Medium | Medium | Lazy loading, compression display |
| Query complexity | Medium | Low | Query validation, sensible defaults |
| Cross-platform issues | Medium | Medium | Test on all platforms early |

---

## 8. Success Metrics

### MVP Success Criteria
- [ ] Can connect to Turbopuffer with API key
- [ ] Can browse all namespaces
- [ ] Can view namespace schema and metadata
- [ ] Can browse documents with pagination
- [ ] Can run vector and filter queries
- [ ] Can export query results

### Quality Metrics
- First Contentful Paint < 500ms
- Time to Interactive < 1s
- Query response displayed < 100ms (after API response)
- No memory leaks during extended use
- Graceful handling of network errors

---

## 9. Open Questions

1. **Vector Input**: What's the best UX for inputting high-dimensional vectors?
   - Text area with comma-separated values?
   - File upload?
   - Reference another document's vector?

2. **Embedding Generation**: Should the app support generating embeddings?
   - Requires integrating with embedding APIs (OpenAI, etc.)
   - Adds complexity but increases utility

3. **Namespace Management**: Should write operations be added later?
   - Document CRUD?
   - Namespace creation/deletion?
   - Would require careful confirmation UX

4. **Multi-tenant**: Should the app support multiple Turbopuffer accounts?
   - Different API keys for different organizations?

---

## 10. Next Steps

1. **Approve this plan** - Review and provide feedback
2. **Set up development environment** - Install dependencies, configure tools
3. **Create component library** - Set up shadcn/ui with custom theme
4. **Build connection flow** - First working feature
5. **Iterate through phases** - Regular demos and feedback

---

## Sources

- [MongoDB Compass](https://www.mongodb.com/products/tools/compass)
- [MongoDB Compass Documentation](https://www.mongodb.com/docs/compass/)
- [Redis Insight](https://redis.io/insight/)
- [Redis Insight Documentation](https://redis.io/docs/latest/develop/tools/insight/)
- [Turbopuffer Documentation](https://turbopuffer.com/docs)
