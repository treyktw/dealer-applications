# Mobile App Setup Guide

## 🚨 CRITICAL WARNING: Package Installation

<div style="background: #fee; border-left: 4px solid #f00; padding: 1rem; margin: 1rem 0;">

### **NEVER install packages from inside `apps/mobile` directory!**

This monorepo shares a Convex backend. Installing packages incorrectly will break the backend and other apps.

### ✅ **ALWAYS use these commands (from repository root):**

```bash
# Install a package
pnpm -C apps/mobile add <package-name>

# Install all dependencies  
pnpm -C apps/mobile install

# Remove a package
pnpm -C apps/mobile remove <package-name>
```

**Run from:** `/Users/treymurray/DevSpace/dealer-applications`  
**NOT from:** `apps/mobile/`

</div>

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set environment variables:**
   ```bash
   # Create apps/mobile/.env
   EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```

3. **Start development:**
   ```bash
   pnpm -C apps/mobile start
   ```

## Important Notes

### Convex Integration
- Mobile app shares the **same Convex backend** as web/desktop apps
- Uses `EXPO_PUBLIC_CONVEX_URL` (not `NEXT_PUBLIC_CONVEX_URL`)
- Schema changes affect all apps - coordinate with team

### Expo Considerations
- Uses Metro bundler (not webpack/Vite)
- Some Node.js modules won't work - use Expo alternatives
- Environment variables must use `EXPO_PUBLIC_*` prefix

### Workspace Packages
- Uses `@dealer/convex-client` from `packages/convex-client`
- Install with: `pnpm -C apps/mobile add @dealer/convex-client@workspace:*`

## Troubleshooting

**Metro can't resolve modules:**
```bash
pnpm -C apps/mobile start --clear
```

**Convex connection issues:**
- Verify `EXPO_PUBLIC_CONVEX_URL` is set
- Check Convex backend: `pnpm dev:convex`

**Type errors:**
- Regenerate types: `pnpm convex:codegen`
- Restart TypeScript server

## Full Documentation

See [Mobile App Documentation](/docs/mobile-app) for complete guide.

