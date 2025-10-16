# DealerPro Desktop Application

A modern desktop application built with Tauri, React, and TypeScript for automotive dealership management.

## Features

- **Deal Management**: Create, track, and manage vehicle deals
- **Client Management**: Store and manage customer information
- **Document Generation**: Generate contracts and legal documents
- **Team Management**: Manage dealership staff and permissions
- **Analytics Dashboard**: View sales performance and insights
- **Subscription Management**: Handle billing and feature access
- **Real-time Updates**: Live data synchronization with Convex backend

## Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Router
- **Desktop Framework**: Tauri 2.0
- **Backend**: Convex (real-time database)
- **Authentication**: Clerk
- **UI Components**: Radix UI, Tailwind CSS
- **State Management**: TanStack Query
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ 
- pnpm
- Rust (for Tauri development)
- macOS development tools (for macOS builds)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dealer-applications
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

## Development

### Running the Desktop App

```bash
# Start the development server
pnpm dev

# Or run Tauri development mode specifically
pnpm tauri dev
```

### Building for Production

#### Universal Build (Recommended)
```bash
# Build for all platforms
pnpm tauri build

# Build specifically for macOS (Universal Apple Silicon + Intel)
pnpm tauri build --target universal-apple-darwin
```

#### Platform-Specific Builds
```bash
# macOS (Intel)
pnpm tauri build --target x86_64-apple-darwin

# macOS (Apple Silicon)
pnpm tauri build --target aarch64-apple-darwin

# Windows
pnpm tauri build --target x86_64-pc-windows-msvc

# Linux
pnpm tauri build --target x86_64-unknown-linux-gnu
```

## Project Structure

```
apps/desktop/
├── src/
│   ├── components/          # Reusable UI components
│   ├── routes/             # Application routes
│   ├── lib/                # Utilities and configurations
│   └── state/              # State management
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/                # Rust source code
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── public/                  # Static assets
└── package.json            # Node.js dependencies
```

## Configuration

### Tauri Configuration

The main Tauri configuration is in `src-tauri/tauri.conf.json`. Key settings:

- **App identifier**: `com.dealerpro.desktop`
- **Window settings**: Size, resizable, etc.
- **Permissions**: File system, network access
- **Bundle settings**: Icons, metadata

### Environment Variables

Required environment variables:

```env
# Convex
CONVEX_DEPLOYMENT=your-deployment-url

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your-clerk-key

# API Keys
STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

## Deployment

### macOS App Store

1. **Build for distribution**
   ```bash
   pnpm tauri build --target universal-apple-darwin
   ```

2. **Sign the application** (requires Apple Developer account)
3. **Upload to App Store Connect**

### Direct Distribution

1. **Build the application**
   ```bash
   pnpm tauri build
   ```

2. **Find the built app** in `src-tauri/target/release/bundle/`

## Troubleshooting

### Common Issues

**Rust compilation errors**
```bash
# Update Rust toolchain
rustup update
```

**Tauri development issues**
```bash
# Clear Tauri cache
rm -rf src-tauri/target
pnpm tauri dev
```

**Node.js dependency issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Development Tips

- Use `pnpm tauri dev` for hot reload during development
- Check browser console for frontend errors
- Check terminal for Tauri/Rust errors
- Use `pnpm tauri info` to check configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues and questions:
- Check the [Tauri documentation](https://tauri.app/)
- Review [React documentation](https://react.dev/)
- Open an issue in this repository
