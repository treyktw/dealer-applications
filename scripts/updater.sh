# scripts/bump-version.sh
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the current version from package.json
CURRENT_VERSION=$(node -p "require('./apps/desktop/package.json').version")

echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Ask for version bump type
echo "Select version bump type:"
echo "1) patch (0.1.2 -> 0.1.3)"
echo "2) minor (0.1.2 -> 0.2.0)"
echo "3) major (0.1.2 -> 1.0.0)"
echo "4) custom (enter specific version)"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    BUMP_TYPE="patch"
    ;;
  2)
    BUMP_TYPE="minor"
    ;;
  3)
    BUMP_TYPE="major"
    ;;
  4)
    read -p "Enter new version (e.g., 1.2.3): " NEW_VERSION
    BUMP_TYPE="custom"
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

# Calculate new version
if [ "$BUMP_TYPE" != "custom" ]; then
  NEW_VERSION=$(node -p "
    const semver = require('semver');
    semver.inc('${CURRENT_VERSION}', '${BUMP_TYPE}');
  ")
fi

echo ""
echo -e "${YELLOW}New version will be: ${GREEN}${NEW_VERSION}${NC}"
echo ""
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
  echo "Aborted"
  exit 1
fi

echo ""
echo -e "${GREEN}Updating version to ${NEW_VERSION}...${NC}"

# Update package.json
echo "📦 Updating package.json..."
node -p "
  const fs = require('fs');
  const pkg = require('./apps/desktop/package.json');
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('./apps/desktop/package.json', JSON.stringify(pkg, null, 2) + '\n');
  'Done'
"

# Update tauri.conf.json
echo "⚙️  Updating tauri.conf.json..."
node -p "
  const fs = require('fs');
  const config = require('./apps/desktop/src-tauri/tauri.conf.json');
  config.version = '${NEW_VERSION}';
  fs.writeFileSync('./apps/desktop/src-tauri/tauri.conf.json', JSON.stringify(config, null, 2) + '\n');
  'Done'
"

# Update Cargo.toml
echo "🦀 Updating Cargo.toml..."
sed -i.bak "s/^version = \".*\"/version = \"${NEW_VERSION}\"/" apps/desktop/src-tauri/Cargo.toml
rm apps/desktop/src-tauri/Cargo.toml.bak

echo ""
echo -e "${GREEN}✓ All version files updated${NC}"
echo ""

# Git operations
read -p "Commit changes and create git tag? (y/n): " git_confirm

if [ "$git_confirm" = "y" ]; then
  echo ""
  echo "📝 Committing changes..."
  git add apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json apps/desktop/src-tauri/Cargo.toml
  git commit -m "chore: bump version to ${NEW_VERSION}"
  
  echo "🏷️  Creating git tag..."
  git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
  
  echo ""
  echo -e "${GREEN}✓ Changes committed and tagged${NC}"
  echo ""
  echo -e "${YELLOW}To push changes and trigger release:${NC}"
  echo -e "  git push origin main"
  echo -e "  git push origin v${NEW_VERSION}"
  echo ""
  
  read -p "Push now? (y/n): " push_confirm
  
  if [ "$push_confirm" = "y" ]; then
    echo ""
    echo "🚀 Pushing to remote..."
    git push origin main
    git push origin "v${NEW_VERSION}"
    echo ""
    echo -e "${GREEN}✓ Pushed! GitHub Actions will now build and release v${NEW_VERSION}${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}Changes made but not committed. You can commit manually:${NC}"
  echo -e "  git add apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json apps/desktop/src-tauri/Cargo.toml"
  echo -e "  git commit -m 'chore: bump version to ${NEW_VERSION}'"
  echo -e "  git tag -a v${NEW_VERSION} -m 'Release v${NEW_VERSION}'"
  echo -e "  git push origin main"
  echo -e "  git push origin v${NEW_VERSION}"
fi

echo ""
echo -e "${GREEN}Done!${NC}"