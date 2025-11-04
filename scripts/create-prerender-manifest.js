// Create a minimal prerender-manifest.json for builds that skip prerendering
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(process.cwd(), '.next', 'prerender-manifest.json');

// Check if manifest already exists
if (fs.existsSync(manifestPath)) {
  console.log('✓ prerender-manifest.json already exists');
  process.exit(0);
}

// Create minimal manifest
const minimalManifest = {
  version: 4,
  routes: {},
  dynamicRoutes: {},
  notFoundRoutes: [],
  preview: {
    previewModeId: 'development-id',
    previewModeSigningKey: 'development-key',
    previewModeEncryptionKey: 'development-encryption-key'
  }
};

// Ensure .next directory exists
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
}

// Write manifest
fs.writeFileSync(manifestPath, JSON.stringify(minimalManifest, null, 2));
console.log('✓ Created minimal prerender-manifest.json');
