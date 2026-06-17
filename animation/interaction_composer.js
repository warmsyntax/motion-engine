import { selectorNoise } from '../physics/noise.js';
import { SpringParams, SpringAxis } from '../types.js';

const PRIMITIVES = ['translate', 'scale', 'rotate', 'opacity', 'shadow', 'blur', 'clip', 'skew'];

function getSelectorHash(selector) {
  let hash = 2166136261;
  for (let i = 0; i < (selector || '').length; i++) {
    hash ^= selector.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministically chooses 2-3 primitives and their amplitudes for a selector.
 */
export function composePrimitives(elementRole, designProfile, selector) {
  const hash = getSelectorHash(selector);
  const noise = selectorNoise(selector); // [0.0, 2.25]

  // Pick number of primitives (2 or 3)
  const numPrimitives = 2 + (hash % 2);

  // Deterministically select unique primitives using hash shifts
  const selected = [];
  let attempt = 0;
  while (selected.length < numPrimitives && attempt < 8) {
    const idx = (hash >> (attempt * 4)) % 8;
    const primitive = PRIMITIVES[idx];
    if (!selected.includes(primitive)) {
      selected.push(primitive);
    }
    attempt++;
  }

  // If we couldn't get enough unique ones, fallback to default selections based on role
  if (selected.length < numPrimitives) {
    const fallbacks = getFallbackPrimitivesByRole(elementRole);
    for (const fb of fallbacks) {
      if (selected.length < numPrimitives && !selected.includes(fb)) {
        selected.push(fb);
      }
    }
  }

  // Construct primitive properties with deterministic amplitudes
  const composition = {};
  selected.forEach((prim, i) => {
    composition[prim] = calculatePrimitiveBounds(prim, elementRole, noise, hash, i);
  });

  return composition;
}

function getFallbackPrimitivesByRole(role) {
  switch (role) {
    case 'button':
      return ['scale', 'translate', 'shadow'];
    case 'card':
      return ['translate', 'shadow', 'scale'];
    case 'nav':
      return ['opacity', 'translate', 'clip'];
    case 'icon':
      return ['rotate', 'scale'];
    case 'hero':
      return ['translate', 'opacity', 'clip'];
    default:
      return ['translate', 'opacity'];
  }
}

function calculatePrimitiveBounds(prim, role, noise, hash, index) {
  const ampSeed = ((hash >> (index * 6)) % 100) / 100; // [0, 1]

  switch (prim) {
    case 'translate':
      // Shift Y or X depending on index
      const direction = (hash + index) % 2 === 0 ? 'Y' : 'X';
      const maxDist = role === 'hero' ? 40 : 8;
      const val = Math.round((ampSeed * maxDist + 2) * 10) / 10;
      return { axis: `translate${direction}`, initial: val, target: 0 };

    case 'scale':
      const scaleVal = Math.round((1.0 + ampSeed * 0.05 + 0.01) * 1000) / 1000;
      return { axis: 'scale', initial: 1.0, target: scaleVal };

    case 'rotate':
      const angle = Math.round((ampSeed * 8 + 1) * 10) / 10;
      const sign = (hash + index) % 2 === 0 ? 1 : -1;
      return { axis: 'rotate', initial: 0, target: angle * sign };

    case 'opacity':
      return { axis: 'opacity', initial: 0.0, target: 1.0 };

    case 'shadow':
      const spread = Math.round(ampSeed * 20 + 8);
      return { axis: 'shadow', initial: 0, target: spread };

    case 'blur':
      const blurRadius = Math.round(ampSeed * 4 + 2);
      return { axis: 'blur', initial: 0, target: blurRadius };

    case 'clip':
      const clipStyle = (hash + index) % 3 === 0 ? 'inset' : (hash + index) % 3 === 1 ? 'circle' : 'polygon';
      return { axis: 'clip', style: clipStyle };

    case 'skew':
      const skewAngle = Math.round((ampSeed * 3 + 0.5) * 10) / 10;
      const skewSign = (hash + index) % 2 === 0 ? 1 : -1;
      return { axis: 'skew', initial: 0, target: skewAngle * skewSign };

    default:
      return { axis: 'opacity', initial: 0, target: 1 };
  }
}
