#!/bin/bash

# Exit on error
set -e

echo "=== Automated Release Script for React Native DevTools ==="

# Get the current version from package.json
CURRENT_VERSION=$(cat package.json | grep '"version":' | sed -E 's/.*"version": "([^"]+)".*/\1/')
echo "Current version: $CURRENT_VERSION"

# Split the version into parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Increment the patch version
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
echo "New version: $NEW_VERSION"

# Update version in package.json
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS uses BSD sed which requires -i ''
  sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
else
  # Linux uses GNU sed
  sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
fi

echo "✅ Updated version in package.json"

# Make sure the TanStack packages exist
if [ ! -f "tanstack-query-devtools-5.67.2.tgz" ] || [ ! -f "tanstack-react-query-devtools-5.69.0.tgz" ]; then
  echo "❌ TanStack package files are missing!"
  echo "   Please ensure these files are in the root directory:"
  echo "   - tanstack-query-devtools-5.67.2.tgz"
  echo "   - tanstack-react-query-devtools-5.69.0.tgz"
  exit 1
fi

# Add TanStack packages to git if they're not tracked
if git ls-files --error-unmatch tanstack-query-devtools-5.67.2.tgz >/dev/null 2>&1; then
  echo "✅ TanStack query-devtools package already tracked by git"
else
  echo "Adding tanstack-query-devtools-5.67.2.tgz to git..."
  git add tanstack-query-devtools-5.67.2.tgz
fi

if git ls-files --error-unmatch tanstack-react-query-devtools-5.69.0.tgz >/dev/null 2>&1; then
  echo "✅ TanStack react-query-devtools package already tracked by git"
else
  echo "Adding tanstack-react-query-devtools-5.69.0.tgz to git..."
  git add tanstack-react-query-devtools-5.69.0.tgz
fi

# Commit the version change
git add package.json
git commit -m "Bump version to $NEW_VERSION"
echo "✅ Committed version change"

# Create a new tag
git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"
echo "✅ Created tag v$NEW_VERSION"

# Push the commit and tag
git push
git push origin "v$NEW_VERSION"
echo "✅ Pushed commit and tag to GitHub"

echo ""
echo "🚀 Release process started!"
echo "   - GitHub Actions workflow should be running soon"
echo "   - Check the Actions tab on GitHub for progress"
echo "   - A draft release will be created when the build completes"
echo ""
echo "✨ Done! ✨" 