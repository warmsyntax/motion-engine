import test from 'node:test';
import assert from 'node:assert';
import { composePrimitives } from '../animation/interaction_composer.js';

test('Interaction Composer Determinism & Varied Amplitude mapping', () => {
  const selectorA = '.btn-submit';
  const selectorB = '.card-feature';

  const resA = composePrimitives('button', {}, selectorA);
  const resB = composePrimitives('card', {}, selectorB);

  // Check determinism
  const resAPrime = composePrimitives('button', {}, selectorA);
  assert.deepStrictEqual(resA, resAPrime);

  // Check unique compositions
  const keysA = Object.keys(resA);
  const keysB = Object.keys(resB);
  
  // They should be arrays of size 2 or 3
  assert.ok(keysA.length >= 2 && keysA.length <= 3);
  assert.ok(keysB.length >= 2 && keysB.length <= 3);

  // Amplitude ranges validation
  if (resA.scale) {
    assert.ok(resA.scale.target >= 0.9 && resA.scale.target <= 1.15);
  }
  if (resA.translate) {
    assert.ok(Math.abs(resA.translate.initial) > 0);
  }
});
