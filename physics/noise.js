const FNV1A_OFFSET = 2166136261;
const FNV1A_PRIME = 16777619;

/// Compute 32-bit FNV-1a hash of a string
function fnv1aHash(str) {
  let hash = FNV1A_OFFSET;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV1A_PRIME);
  }
  return hash >>> 0; // force unsigned 32-bit integer
}

/// Compute deterministic noise in range [0.0, 2.25] for CSS selectors.
export function selectorNoise(selector) {
  const hash = fnv1aHash(selector || '');
  const seed = hash % 10;
  return seed * 0.25;
}

/// Apply FNV-1a noise to stiffness and damping.
export function applyNoise(stiffness, damping, selector) {
  const noise = selectorNoise(selector);
  return [stiffness + noise, damping + noise * 0.3];
}
