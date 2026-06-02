/// Simulate a damped spring and return the settle time in milliseconds.
/// Settlement is defined as when position and velocity drop below threshold.
/// Uses Euler integration with dt = 0.5ms.
export function computeSettleTime(stiffness, damping, mass, threshold = 0.05) {
  const dt = 0.0005; // 0.5ms step
  const maxTime = 5.0; // 5 seconds max simulation

  let x = 1.0; // normalized initial displacement
  let v = 0.0; // initial velocity
  let t = 0.0;

  while (t < maxTime) {
    // F = -kx - cv
    const force = -stiffness * x - damping * v;
    const acceleration = force / mass;

    // Euler integration
    v += acceleration * dt;
    x += v * dt;
    t += dt;

    // Check if settled (both position and velocity are small)
    if (Math.abs(x) < threshold && Math.abs(v) < threshold * Math.sqrt(stiffness)) {
      return t * 1000.0; // convert to ms
    }
  }

  return maxTime * 1000.0; // didn't settle
}

/// Validate and correct spring parameters to ensure settling duration is in optimal window.
export function validateDuration(stiffness, damping, mass, minMs = 150.0, maxMs = 800.0) {
  let k = stiffness;
  const threshold = 0.05;
  const maxIterations = 20;

  for (let i = 0; i < maxIterations; i++) {
    const settleMs = computeSettleTime(k, damping, mass, threshold);

    if (settleMs >= minMs && settleMs <= maxMs) {
      return [k, damping, mass, Math.round(settleMs)];
    }

    if (settleMs < minMs) {
      // Settles too fast → reduce stiffness (make it lazier)
      k *= 0.85;
    } else {
      // Settles too slow → increase stiffness (make it snappier)
      k *= 1.15;
    }

    // Clamp stiffness to standard sane range
    k = Math.max(50.0, Math.min(k, 1200.0));
  }

  // Return best effort
  const finalSettle = computeSettleTime(k, damping, mass, threshold);
  return [k, damping, mass, Math.round(finalSettle)];
}
