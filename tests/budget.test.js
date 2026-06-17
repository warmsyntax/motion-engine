import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { parseActiveMotionSpecs, assessMotionBudget } from '../budget/motion_budget.js';

const sandboxDir = path.resolve('tests/sandbox');

test('Budget parsing and validation rules', () => {
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  // Write a simulated motion.md with 3 animated elements (within budget limit of 8)
  const mockContent = `
# MOTION SPECIFICATION

## 2. PHYSICS BLOCKS
- **Target Element**: \`.hero-card\`
- **Source**: solver
- **Trigger Type**: scroll
- **Purpose**: \`feedback\`

### Axis/Property: \`translateY\`
\`\`\`yaml
stiffness: 300
damping: 20
mass: 1
\`\`\`

---
- **Target Element**: \`.submit-btn\`
- **Purpose**: \`feedback\`

### Axis/Property: \`scale\`
\`\`\`yaml
stiffness: 400
damping: 10
\`\`\`

---
- **Target Element**: \`.nav-link\`
- **Purpose**: \`feedback\`

### Axis/Property: \`opacity\`
\`\`\`yaml
stiffness: 150
damping: 30
\`\`\`
`;

  const motionMdPath = path.join(sandboxDir, 'motion.md');
  fs.writeFileSync(motionMdPath, mockContent, 'utf8');

  // Verify parser
  const specs = parseActiveMotionSpecs(sandboxDir);
  assert.strictEqual(specs.length, 3);
  assert.strictEqual(specs[0].target, '.hero-card');
  assert.strictEqual(specs[0].axis, 'translateY');

  // Verify budget auditor passes
  const report = assessMotionBudget(sandboxDir);
  assert.strictEqual(report.ok, true);
  assert.strictEqual(report.elementCount, 3);
  assert.strictEqual(report.warnings.length, 0);

  // Clean up
  try {
    fs.unlinkSync(motionMdPath);
  } catch (err) {}
});
