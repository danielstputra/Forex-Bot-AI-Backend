const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const mainFile = path.join(distDir, 'main.js');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the redirect script pointing to the API Gateway
fs.writeFileSync(mainFile, 'require("./apps/forex-bot-backend/main.js");\n');
console.log('[Postbuild] Created redirect entrypoint at dist/main.js -> dist/apps/forex-bot-backend/main.js');
