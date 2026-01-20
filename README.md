# Turbopuffer Insight

A desktop application for browsing and managing your [Turbopuffer](https://turbopuffer.com) vector database namespaces.

## Features

- **Namespace Browser**: View all your namespaces in a flat list or hierarchical tree view
- **Document Viewer**: Browse documents with table, JSON, and card view modes
- **Schema Inspector**: View field definitions, types, and properties
- **Statistics Dashboard**: Monitor document counts, storage usage, and index status
- **Multiple Connections**: Manage multiple Turbopuffer API profiles
- **Secure Storage**: API keys are encrypted using your system's secure storage
- **Export**: Export documents as JSON
- **Auto-updates**: Automatic update notifications when new versions are available

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/agent-wally/turbopuffer-insight/releases) page:

- **macOS**: `Turbopuffer.Insight-x.x.x-mac.dmg` or `.zip`
- **Windows**: `Turbopuffer.Insight-x.x.x-setup.exe` (installer) or `-portable.exe`
- **Linux**: `Turbopuffer.Insight-x.x.x-linux.AppImage` or `.deb`

### macOS

1. Download the `.dmg` file
2. Open the DMG and drag Turbopuffer Insight to your Applications folder
3. On first launch, you may need to right-click and select "Open" to bypass Gatekeeper

### Windows

1. Download the `-setup.exe` installer
2. Run the installer and follow the prompts
3. Launch from the Start Menu or Desktop shortcut

### Linux

For AppImage:

```bash
chmod +x Turbopuffer.Insight-*.AppImage
./Turbopuffer.Insight-*.AppImage
```

For Debian/Ubuntu:

```bash
sudo dpkg -i turbopuffer-insight-*.deb
```

## Usage

### Getting Started

1. Launch Turbopuffer Insight
2. Click "Add Connection" on the home page
3. Enter your Turbopuffer API key (get one from [turbopuffer.com](https://turbopuffer.com))
4. Click "Connect" to test and save the connection

### Browsing Namespaces

- Use the sidebar to browse your namespaces
- Toggle between flat list and tree view using the settings icon
- Configure the tree delimiter (default: `_`) to customize grouping
- Click on a namespace to view its documents and schema

### Viewing Documents

- **Table View**: Spreadsheet-style view with columns for each attribute
- **JSON View**: Raw JSON representation of documents
- **Card View**: Grid of cards showing document previews

Use the pagination controls to navigate through documents and change the page size.

### Keyboard Shortcuts

| Shortcut               | Action                 |
| ---------------------- | ---------------------- |
| `Cmd/Ctrl + R`         | Reload current view    |
| `Cmd/Ctrl + Shift + I` | Toggle Developer Tools |
| `Cmd/Ctrl + +/-`       | Zoom in/out            |
| `Cmd/Ctrl + 0`         | Reset zoom             |

## Development

### Prerequisites

- [Node.js](https://nodejs.org) 18 or later
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/agent-wally/turbopuffer-insight.git
cd turbopuffer-insight

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload

# Type checking
npm run typecheck    # Run TypeScript type checking

# Linting & Formatting
npm run lint         # Run ESLint
npm run format       # Format code with Prettier

# Building
npm run build        # Build for production
npm run build:mac    # Build for macOS
npm run build:win    # Build for Windows
npm run build:linux  # Build for Linux
```

### Project Structure

```
turbopuffer-insight/
├── src/
│   ├── main/           # Electron main process
│   │   └── index.ts    # Main entry point, IPC handlers
│   ├── preload/        # Preload scripts
│   │   ├── index.ts    # IPC bridge
│   │   └── index.d.ts  # Type definitions
│   └── renderer/       # React frontend
│       ├── src/
│       │   ├── api/        # API hooks and types
│       │   ├── components/ # React components
│       │   ├── pages/      # Page components
│       │   ├── stores/     # Zustand stores
│       │   └── lib/        # Utilities
│       └── index.html
├── build/              # Build resources (icons, entitlements)
├── electron-builder.yml
└── package.json
```

### Tech Stack

- **Framework**: [Electron](https://electronjs.org) with [electron-vite](https://electron-vite.org)
- **Frontend**: [React 19](https://react.dev) with [TypeScript](https://typescriptlang.org)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **UI Components**: [Radix UI](https://radix-ui.com) primitives
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Routing**: [React Router](https://reactrouter.com)

## Security

- API keys are stored using Electron's [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) API, which uses your operating system's secure credential storage
- All API requests are made from the main process, preventing exposure of credentials to web content
- Content Security Policy (CSP) headers restrict what resources can be loaded
- SSRF protection validates that API requests only go to Turbopuffer endpoints

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Turbopuffer](https://turbopuffer.com) for the vector database
- [electron-vite](https://electron-vite.org) for the build tooling
- [shadcn/ui](https://ui.shadcn.com) for UI component inspiration
