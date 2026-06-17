import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { auditWorkspacePerformance } from '../validation/performance_auditor.js';

const sandboxDir = path.resolve('tests/sandbox');

test('Performance Auditor scanning checks', () => {
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  // 1. Write an unoptimized CSS file with transition: all
  const badCssContent = `
.card-bad {
  transition: all 0.3s ease;
  width: 100px;
}
.card-bad:hover {
  width: 200px;
}
`;

  fs.writeFileSync(path.join(sandboxDir, 'style.css'), badCssContent, 'utf8');

  // Verify performance audit detects it
  const result = auditWorkspacePerformance(sandboxDir);
  assert.strictEqual(result.ok, false);

  const issues = result.issues;
  assert.ok(issues.length > 0);

  const allRules = issues.map(i => i.rule);
  assert.ok(allRules.includes('Banned transition: all'));
  assert.ok(allRules.includes('Missing prefers-reduced-motion fallback'));
});
