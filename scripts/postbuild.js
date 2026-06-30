const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const mainFile = path.join(distDir, 'main.js');
const distScriptsDir = path.join(distDir, 'scripts');
const dbDeploySrc = path.join(__dirname, 'db-deploy.js');
const dbDeployDest = path.join(distScriptsDir, 'db-deploy.js');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Ensure dist/scripts directory exists
if (!fs.existsSync(distScriptsDir)) {
  fs.mkdirSync(distScriptsDir, { recursive: true });
}

// Write the redirect script pointing to the API Gateway
fs.writeFileSync(mainFile, 'require("./apps/forex-bot-backend/main.js");\n');
console.log('[Postbuild] Created redirect entrypoint at dist/main.js -> dist/apps/forex-bot-backend/main.js');

// Copy db-deploy.js into dist/scripts/ so it survives Railway's source cleanup
if (fs.existsSync(dbDeploySrc)) {
  fs.copyFileSync(dbDeploySrc, dbDeployDest);
  console.log('[Postbuild] Copied db-deploy.js to dist/scripts/db-deploy.js');
} else {
  console.warn('[Postbuild] WARNING: scripts/db-deploy.js not found, skipping copy.');
}
