import { decomposeMatrix } from '../math/matrix_decompose.js';
import { computeSettleTime } from './duration_validator.js';
import { SpringParams } from '../types.js';

/// Analytical damped harmonic oscillator position at time t (in seconds).
/// Assumes initial normalized displacement x(0) = 1.0, initial velocity v(0) = 0.0.
export function analyticalSpringDisplacement(t, stiffness, damping, mass = 1.0) {
  const k = stiffness;
  const c = damping;
  const m = mass;

  const critical = 2.0 * Math.sqrt(k * m);
  const zeta = critical === 0.0 ? 1.0 : c / critical;
  const gamma = c / (2.0 * m);

  if (zeta < 0.999) {
    // Underdamped
    const omega_d = Math.sqrt(k / m - gamma * gamma);
    return Math.exp(-gamma * t) * (Math.cos(omega_d * t) + (gamma / omega_d) * Math.sin(omega_d * t));
  } else if (zeta > 1.001) {
    // Overdamped
    const omega_0 = Math.sqrt(k / m);
    const beta = Math.sqrt(gamma * gamma - omega_0 * omega_0);
    return Math.exp(-gamma * t) * (Math.cosh(beta * t) + (gamma / beta) * Math.sinh(beta * t));
  } else {
    // Critically damped
    return (1.0 + gamma * t) * Math.exp(-gamma * t);
  }
}

/// Sweeps a grid of (stiffness, damping) and refines parameters using coordinate descent.
/// Fits samples array: [{ t: seconds, x: normalized_position }].
export function fitSpringCurve(samples) {
  if (!samples || samples.length === 0) {
    return [300.0, 20.0, 0.0];
  }

  let bestK = 300.0;
  let bestC = 20.0;
  let minError = Infinity;

  // 1. Grid search global sweep
  for (let kIdx = 0; kIdx <= 50; kIdx++) {
    const k = 50.0 + kIdx * 15.0; // 50 to 800
    for (let cIdx = 0; cIdx <= 30; cIdx++) {
      const c = 5.0 + cIdx * 3.0; // 5 to 95

      let sumErrorSq = 0.0;
      for (const sample of samples) {
        const xPred = analyticalSpringDisplacement(sample.t, k, c, 1.0);
        const err = sample.x - xPred;
        sumErrorSq += err * err;
      }

      if (sumErrorSq < minError) {
        minError = sumErrorSq;
        bestK = k;
        bestC = c;
      }
    }
  }

  // 2. Coordinate descent local refinement
  let stepK = 5.0;
  let stepC = 1.0;
  for (let iter = 0; iter < 10; iter++) {
    const candidates = [
      [bestK + stepK, bestC],
      [bestK - stepK, bestC],
      [bestK, bestC + stepC],
      [bestK, bestC - stepC]
    ];

    let improved = false;
    for (const [k, c] of candidates) {
      if (k < 10.0 || c < 1.0) continue;

      let sumErrorSq = 0.0;
      for (const sample of samples) {
        const xPred = analyticalSpringDisplacement(sample.t, k, c, 1.0);
        const err = sample.x - xPred;
        sumErrorSq += err * err;
      }

      if (sumErrorSq < minError) {
        minError = sumErrorSq;
        bestK = k;
        bestC = c;
        improved = true;
      }
    }

    if (!improved) {
      stepK *= 0.5;
      stepC *= 0.5;
    }
  }

  // 3. Compute R^2 fit quality metric
  let meanObs = 0.0;
  for (const sample of samples) {
    meanObs += sample.x;
  }
  meanObs /= samples.length;

  let ssTot = 0.0;
  let ssRes = 0.0;
  for (const sample of samples) {
    const xPred = analyticalSpringDisplacement(sample.t, bestK, bestC, 1.0);
    const diffTot = sample.x - meanObs;
    const diffRes = sample.x - xPred;
    ssTot += diffTot * diffTot;
    ssRes += diffRes * diffRes;
  }

  const r2 = ssTot === 0.0 ? 1.0 : Math.max(0.0, Math.min(1.0, 1.0 - ssRes / ssTot));

  return [bestK, bestC, r2];
}

/// Fit parameters from raw frames collected by telemetry
export function fitAxisTelemetry(frames, axis, themeProfile) {
  if (!frames || frames.length < 5) return null;

  let rawSamples = [];
  for (const frame of frames) {
    let val = 0.0;
    if (axis === 'opacity') {
      val = frame.opacity;
    } else {
      try {
        const decomp = decomposeMatrix(frame.transform);
        if (axis === 'translateY') val = decomp.translate[1];
        else if (axis === 'translateX') val = decomp.translate[0];
        else if (axis === 'scale') val = decomp.scale[0];
        else continue;
      } catch (err) {
        continue;
      }
    }
    rawSamples.push({ t: frame.t / 1000.0, val }); // convert t to seconds
  }

  if (rawSamples.length < 5) return null;

  const initialVal = rawSamples[0].val;
  const targetVal = rawSamples[rawSamples.length - 1].val;
  const range = targetVal - initialVal;

  if (Math.abs(range) < 1e-4) {
    return null; // no meaningful displacement
  }

  // Normalize so x(0) = 1.0, x(equilibrium) = 0.0
  const normalizedSamples = rawSamples.map(s => ({
    t: s.t,
    x: (s.val - targetVal) / (initialVal - targetVal)
  }));

  const [k, c, r2] = fitSpringCurve(normalizedSamples);
  const mass = 1.0;
  const settleMs = Math.round(computeSettleTime(k, c, mass, 0.05));
  const dampingRatio = SpringParams.computeDampingRatio(k, c, mass);

  return new SpringParams({
    axis,
    stiffness: Math.round(k * 100) / 100,
    damping: Math.round(c * 100) / 100,
    mass,
    damping_ratio: Math.round(dampingRatio * 1000) / 1000,
    perceptual_duration_ms: settleMs,
    initial_value: initialVal,
    target_value: targetVal
  });
}
