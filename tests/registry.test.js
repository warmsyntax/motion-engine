import test from 'node:test';
import assert from 'node:assert';
import { handleMcpRequest } from '../server.js';

test('MCP Initialization & Handshake', async () => {
  const req = { id: 1, method: 'initialize', params: {} };
  const res = await handleMcpRequest(req);
  assert.strictEqual(res.result.serverInfo.version, '2.0.0');
});

test('MCP list all tools', async () => {
  const req = { id: 2, method: 'tools/list' };
  const res = await handleMcpRequest(req);
  assert.ok(Array.isArray(res.result.tools));
  assert.strictEqual(res.result.tools.length, 6);
  
  const names = res.result.tools.map(t => t.name);
  assert.ok(names.includes('generate_motion_spec'));
  assert.ok(names.includes('generate_text_animation'));
  assert.ok(names.includes('assess_motion_budget'));
});

test('MCP list and get prompts', async () => {
  const listReq = { id: 3, method: 'prompts/list' };
  const listRes = await handleMcpRequest(listReq);
  assert.ok(listRes.result.prompts.length >= 3);

  const getReq = {
    id: 4,
    method: 'prompts/get',
    params: {
      name: 'motion_intent',
      arguments: { kinetic_weight: 'heavy' }
    }
  };
  const getRes = await handleMcpRequest(getReq);
  assert.ok(getRes.result.messages[0].content.text.includes('heavy'));
});
