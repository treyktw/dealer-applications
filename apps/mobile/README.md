# Mobile App

React Native mobile application built with Expo and integrated with Convex backend.

## 🚨 CRITICAL: Package Installation Warning

<div style="background: #fee; border-left: 4px solid #f00; padding: 1rem; margin: 1rem 0;">

### **⚠️ NEVER RUN `pnpm install` OR `pnpm add` FROM THIS DIRECTORY!**

This is a **monorepo workspace**. The Convex backend is shared with other apps. Installing packages incorrectly will:

- ❌ Break the Convex backend dependencies
- ❌ Corrupt the workspace lockfile  
- ❌ Cause dependency resolution conflicts
- ❌ Break other apps (web, desktop)

### ✅ **ALWAYS use these commands from the repository root:**

```bash
# From: /Users/treymurray/DevSpace/dealer-applications
# NOT from: apps/mobile/

# Install a package
pnpm -C apps/mobile add <package-name>

# Install all dependencies
pnpm -C apps/mobile install

# Remove a package  
pnpm -C apps/mobile remove <package-name>
```

**The `-C apps/mobile` flag tells pnpm to run the command in the mobile app directory while maintaining workspace integrity.**

</div>

## Quick Start

```bash
# From repository root
pnpm -C apps/mobile start
```

## Environment Setup

Create `.env` file:
```bash
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## Development

```bash
# Start Expo dev server
pnpm -C apps/mobile start

# Run on iOS
pnpm -C apps/mobile ios

# Run on Android
pnpm -C apps/mobile android

# Run on web
pnpm -C apps/mobile web
```

## Important Notes

- **Shared Backend**: Uses the same Convex backend as web/desktop apps
- **Environment Variables**: Must use `EXPO_PUBLIC_*` prefix (not `NEXT_PUBLIC_*`)
- **Workspace Packages**: Uses `@dealer/convex-client` from `packages/convex-client`

## Documentation

- [Full Mobile App Documentation](/docs/mobile-app)
- [Quick Setup Guide](../../docs/MOBILE_APP_SETUP.md)

---

**Remember: Always use `pnpm -C apps/mobile` for package operations!**

