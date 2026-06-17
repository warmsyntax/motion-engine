import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { isPretextAvailable, generateTextAnimationCode } from '../integration/pretext_bridge.js';
import { scanForHallmarkDesign, getHallmarkThematicModifications } from '../integration/hallmark_bridge.js';

const sandboxDir = path.resolve('tests/sandbox');

test('Pretext availability & fallback code snippets', () => {
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  // 1. Mock package.json without pretext
  fs.writeFileSync(path.join(sandboxDir, 'package.json'), '{}', 'utf8');
  assert.strictEqual(isPretextAvailable(sandboxDir), false);

  // 2. Mock package.json with pretext
  fs.writeFileSync(path.join(sandboxDir, 'package.json'), JSON.stringify({
    dependencies: { '@chenglou/pretext': '^1.0.0' }
  }), 'utf8');
  assert.strictEqual(isPretextAvailable(sandboxDir), true);

  // 3. Snippet generation checks
  const res = generateTextAnimationCode({
    selector: '.title',
    splitBy: 'word',
    workspacePath: sandboxDir
  });
  assert.strictEqual(res.mode, 'pretext');
  assert.ok(res.js.includes('@chenglou/pretext'));
});

test('Hallmark design.md template parsing', () => {
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  const mockDesignMd = `
# Hallmark Design Profile

## Macrostructure
- Asymmetric Grid layout

## Type-Pairing
- Editorial Serif Heading + Standard Sans Body

## Theme Fingerprint
- Editorial Luxury Luxury
`;

  fs.writeFileSync(path.join(sandboxDir, 'design.md'), mockDesignMd, 'utf8');

  // Verify parser
  const profile = scanForHallmarkDesign(sandboxDir);
  assert.ok(profile.macrostructure.toLowerCase().includes('grid'));
  assert.ok(profile.type_pairing.toLowerCase().includes('serif'));

  // Verify modifications mapping
  const mods = getHallmarkThematicModifications(profile);
  assert.strictEqual(mods.tempoScale, 0.6); // luxury fingerprint overrides serif tempo (0.7 → 0.6)
  assert.strictEqual(mods.stiffnessCap, 200);
  assert.strictEqual(mods.suggestedChoreography, 'radial'); // asymmetric grid -> radial stagger
});
