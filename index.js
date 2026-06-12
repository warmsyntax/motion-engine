#!/usr/bin/env node
import readline from 'readline';
import { handleMcpRequest } from './server.js';

console.error('[motion-engine] Starting Model Context Protocol (MCP) Server (Node.js)...');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      error: { code: -32700, message: `Parse error: ${err.message}` }
    };
    console.log(JSON.stringify(errorResponse));
    return;
  }

  try {
    const response = await handleMcpRequest(request);
    // Notifications return null — do not write anything to stdout for them
    if (response !== null) {
      console.log(JSON.stringify(response));
    }
  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: request ? request.id : null,
      error: { code: -32603, message: `Internal server error: ${err.message}` }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

process.on('SIGINT', () => {
  console.error('[motion-engine] Shutting down stdio transport...');
  process.exit(0);
});
