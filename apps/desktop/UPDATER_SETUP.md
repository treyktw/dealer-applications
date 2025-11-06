# Desktop App Updater Setup Guide

## Overview

The desktop app uses **Tauri's built-in updater** to provide automatic updates. Updates are distributed through **GitHub Releases**.

## Current Status

✅ UpdateManager component implemented
✅ Tauri updater plugin configured
✅ GitHub release endpoint configured
⚠️ **NEEDS SETUP**: Signing keys and GitHub workflow

---

## Setup Instructions

### Step 1: Generate Signing Keys

The updater requires signing keys to verify updates are authentic.

```bash
# Install Tauri CLI if not already installed
npm install -g @tauri-apps/cli

# Navigate to desktop app
cd apps/desktop

# Generate new signing keypair
pnpm tauri signer generate

# This will output:
# - Private key (keep this SECRET!)
# - Public key (put in tauri.conf.json)
```

**IMPORTANT:**
- **NEVER** commit the private key to git
- Store private key in GitHub Secrets as `TAURI_PRIVATE_KEY`
- Put public key in `tauri.conf.json` → `plugins.updater.pubkey`

### Step 2: Update tauri.conf.json

Replace the `pubkey` value in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/treyktw/dealer-applications/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      },
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### Step 3: Set Up GitHub Actions

Create `.github/workflows/release-desktop.yml`:

```yaml
name: Release Desktop App

on:
  push:
    tags:
      - 'v*.*.*'  # Triggers on version tags like v1.0.0

jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-latest'
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install dependencies (Ubuntu only)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install dependencies
        run: pnpm install

      - name: Build desktop app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
        with:
          projectPath: apps/desktop
          tagName: ${{ github.ref_name }}
          releaseName: 'Dealer Software ${{ github.ref_name }}'
          releaseBody: 'See CHANGELOG.md for details'
          releaseDraft: false
          prerelease: false
```

### Step 4: Add GitHub Secrets

Go to **GitHub Repository → Settings → Secrets and variables → Actions**

Add:
- `TAURI_PRIVATE_KEY`: Your private signing key from Step 1
- `TAURI_KEY_PASSWORD`: Password for the private key (if you set one)

### Step 5: Create a Release

```bash
# Update version in tauri.conf.json and package.json
nano apps/desktop/src-tauri/tauri.conf.json
# Change "version": "0.1.3" to "0.2.0"

# Commit changes
git add .
git commit -m "Bump version to v0.2.0"

# Create and push tag
git tag v0.2.0
git push origin v0.2.0

# GitHub Actions will automatically:
# 1. Build the app for all platforms
# 2. Sign the binaries
# 3. Create a release with latest.json
# 4. Users will get auto-update notifications
```

---

## How Auto-Update Works

### 1. On App Launch
```typescript
// UpdateManager.tsx checks for updates automatically
useEffect(() => {
  checkForUpdates(false);
}, []);
```

### 2. Check Endpoint
The app fetches:
```
https://github.com/treyktw/dealer-applications/releases/latest/download/latest.json
```

Which contains:
```json
{
  "version": "0.2.0",
  "pub_date": "2024-01-15T12:00:00Z",
  "url": "https://github.com/.../app.dmg.tar.gz",
  "signature": "base64-encoded-signature",
  "notes": "What's new in this release"
}
```

### 3. If Update Available
- Show dialog to user
- User clicks "Update Now"
- Download & verify signature
- Install in background (passive mode on Windows)
- Restart app

### 4. Verification
- Signature is verified using the public key in `tauri.conf.json`
- If signature doesn't match, update is rejected
- This prevents malicious updates

---

## Testing Updates

### Test on Staging

1. Create a test release:
```bash
git tag v0.1.4-beta
git push origin v0.1.4-beta
```

2. Build manually:
```bash
cd apps/desktop
pnpm tauri build
```

3. Test the updater:
```bash
# In the app, go to Settings → About
# Click "Check for Updates"
```

### Test Update Flow

1. Install v0.1.3
2. Publish v0.1.4 to GitHub
3. Launch app
4. Should show update dialog
5. Click "Update Now"
6. Verify restart and new version

---

## Troubleshooting

### "Update server not configured"
- Means no `latest.json` exists on GitHub
- Need to publish at least one release with the workflow

### "Signature verification failed"
- Public key in `tauri.conf.json` doesn't match private key used to sign
- Regenerate keys and update both

### "Failed to download update"
- Check network connectivity
- Verify GitHub release assets are public
- Check release endpoint URL

### Updates not showing
- Version in `tauri.conf.json` must be lower than release version
- Check console logs for errors
- Try manual check from Settings

---

## Version Numbering

Use semantic versioning:
- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

Examples:
- `v1.0.0` → Initial release
- `v1.1.0` → Add new feature
- `v1.1.1` → Fix bug
- `v2.0.0` → Breaking changes

---

## Rollback Strategy

If a bad update is released:

1. **Immediately:** Delete the GitHub release
2. **Create hotfix:**
   ```bash
   git tag v1.1.2
   git push origin v1.1.2
   ```
3. **Notify users:** via email or in-app notification

---

## Current Configuration

- **Version**: 0.1.3
- **Endpoint**: GitHub Releases
- **Install Mode**: Passive (Windows)
- **Platforms**: macOS (Intel + Apple Silicon), Windows, Linux
- **Update Check**: On app launch + manual from Settings

---

## Next Steps

1. ✅ Generate signing keys
2. ✅ Update public key in tauri.conf.json
3. ✅ Add GitHub secrets
4. ✅ Create release workflow
5. ✅ Test with a beta release
6. ✅ Monitor update success rate

---

## Security Notes

- ✅ Signatures prevent tampering
- ✅ HTTPS-only downloads
- ✅ Public key verification
- ⚠️ **NEVER** expose private key
- ⚠️ Store private key in GitHub Secrets only
