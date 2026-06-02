import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

console.log('🚀 Starting motion-engine-mcp Setup & Auto-Installer...\n');

// 1. Run npm install to fetch Puppeteer
try {
  console.log('📦 Installing dependencies (Puppeteer)...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully.\n');
} catch (err) {
  console.error('❌ Failed to install dependencies automatically. Please run "npm install" manually.');
}

// 2. Run test.js to verify physics
try {
  console.log('🧪 Running automated verification tests...');
  execSync('node test.js', { stdio: 'inherit' });
  console.log();
} catch (err) {
  console.error('❌ Tests failed. Please check the implementation.\n');
  process.exit(1);
}

// 3. Auto-configure Claude Desktop MCP Config if possible
try {
  console.log('⚙️ Detecting Claude Desktop configuration...');
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? `${os.homedir()}/Library/Application Support` : `${os.homedir()}/.config`);
  const claudeConfigPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
  const projectRoot = path.resolve('.');

  let config = { mcpServers: {} };
  let configExists = false;

  if (fs.existsSync(claudeConfigPath)) {
    configExists = true;
    try {
      const content = fs.readFileSync(claudeConfigPath, 'utf8');
      config = JSON.parse(content);
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      console.warn('⚠️ Found existing Claude configuration but failed to parse it. Backing up and creating a clean one.');
      fs.copyFileSync(claudeConfigPath, `${claudeConfigPath}.bak`);
    }
  } else {
    // Ensure parent directory exists
    const parentDir = path.dirname(claudeConfigPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  // Register our server
  config.mcpServers['motion-engine'] = {
    command: 'node',
    args: [path.join(projectRoot, 'index.js')]
  };

  fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`🎉 SUCCESS: Automatically registered motion-engine-mcp to Claude Desktop!`);
  console.log(`Config File: ${claudeConfigPath}\n`);
} catch (err) {
  console.error(`⚠️ Could not auto-configure Claude Desktop: ${err.message}`);
  console.log('Please configure it manually in your Claude config file using:');
  console.log(JSON.stringify({
    mcpServers: {
      "motion-engine": {
        "command": "node",
        "args": [path.resolve('./index.js')]
      }
    }
  }, null, 2));
  console.log();
}

console.log('⚡ SETUP COMPLETE! You can now load the "motion-engine" tool in Claude, Cursor, or Gemini CLI.');
