import { validateDuration } from './duration_validator.js';
import { applyNoise } from './noise.js';
import { SpringParams, KineticWeight, SpringAxis, TriggerType, ThemeProfile } from '../types.js';

const BaseSpringConfigs = {
  [KineticWeight.HEAVY]: { stiffness: 120.0, damping: 35.0, mass: 2.0 },
  [KineticWeight.GROUNDED]: { stiffness: 200.0, damping: 28.0, mass: 1.5 },
  [KineticWeight.BALANCED]: { stiffness: 300.0, damping: 22.0, mass: 1.0 },
  [KineticWeight.LIGHT]: { stiffness: 400.0, damping: 15.0, mass: 0.8 },
  [KineticWeight.FLOATING]: { stiffness: 500.0, damping: 10.0, mass: 0.5 }
};

const AxisModifiers = {
  [SpringAxis.Opacity]: { stiffnessMult: 1.3, dampingMult: 1.4, massMult: 0.5 },
  [SpringAxis.Scale]: { stiffnessMult: 1.1, dampingMult: 1.1, massMult: 0.9 },
  [SpringAxis.ScaleX]: { stiffnessMult: 1.1, dampingMult: 1.1, massMult: 0.9 },
  [SpringAxis.ScaleY]: { stiffnessMult: 1.1, dampingMult: 1.1, massMult: 0.9 },
  [SpringAxis.Rotate]: { stiffnessMult: 0.9, dampingMult: 1.3, massMult: 1.1 },
  [SpringAxis.RotateX]: { stiffnessMult: 0.9, dampingMult: 1.3, massMult: 1.1 },
  [SpringAxis.RotateY]: { stiffnessMult: 0.9, dampingMult: 1.3, massMult: 1.1 },
  [SpringAxis.RotateZ]: { stiffnessMult: 0.9, dampingMult: 1.3, massMult: 1.1 }
};

function getAxisModifier(axis) {
  return AxisModifiers[axis] || { stiffnessMult: 1.0, dampingMult: 1.0, massMult: 1.0 };
}

/// Generates spring parameters for a single axis using Hooke's Law and theme profile constraints.
export function solveAxis({
  axis,
  intent,
  theme,
  selector,
  initial_value,
  target_value
}) {
  const base = BaseSpringConfigs[intent.kinetic_weight] || BaseSpringConfigs[KineticWeight.BALANCED];
  const mod = getAxisModifier(axis);

  // Apply modifiers
  let k = base.stiffness * mod.stiffnessMult;
  let c = base.damping * mod.dampingMult;
  let m = base.mass * mod.massMult;

  // Apply brand tempo scaling
  k *= theme.tempo_scale;

  // Apply font weight mass scaling
  m *= theme.getMassMultiplier();

  // Apply typography constraints
  k = Math.min(k, theme.getMaxStiffness());
  c = Math.max(c, theme.getMinDamping());

  // Inject selector-based deterministic noise
  const [kNoised, cNoised] = applyNoise(k, c, selector);
  k = kNoised;
  c = cNoised;

  // Validate perceptual duration (150ms-800ms)
  const [kValid, cValid, mValid, settleMs] = validateDuration(k, c, m, 150.0, 800.0);

  const dampingRatio = SpringParams.computeDampingRatio(kValid, cValid, mValid);

  return new SpringParams({
    axis,
    stiffness: Math.round(kValid * 100) / 100,
    damping: Math.round(cValid * 100) / 100,
    mass: Math.round(mValid * 100) / 100,
    damping_ratio: Math.round(dampingRatio * 1000) / 1000,
    perceptual_duration_ms: settleMs,
    initial_value,
    target_value
  });
}

/// Create scroll reveal spring spec
export function solveScrollReveal(intent, theme, selector) {
  return [
    solveAxis({
      axis: SpringAxis.TranslateY,
      intent,
      theme,
      selector,
      initial_value: 40.0,
      target_value: 0.0
    }),
    solveAxis({
      axis: SpringAxis.Opacity,
      intent,
      theme,
      selector,
      initial_value: 0.0,
      target_value: 1.0
    })
  ];
}

/// Create hover lift spring spec
export function solveHoverLift(intent, theme, selector) {
  return [
    solveAxis({
      axis: SpringAxis.TranslateY,
      intent,
      theme,
      selector,
      initial_value: 0.0,
      target_value: -8.0
    }),
    solveAxis({
      axis: SpringAxis.Scale,
      intent,
      theme,
      selector,
      initial_value: 1.0,
      target_value: 1.02
    })
  ];
}
