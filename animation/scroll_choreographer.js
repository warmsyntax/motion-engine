import { selectorNoise } from '../physics/noise.js';
import { solveAxis } from '../physics/spring_solver.js';
import { SpringAxis, KineticWeight, TriggerType, ThemeProfile } from '../types.js';

/**
 * Choreographs scroll animations for a group of selectors.
 */
export function choreographScroll({
  selectors,
  mode = 'cascade',
  intent = 'balanced',
  themeProfile,
  workspacePath = '.'
}) {
  const finalTimeline = [];
  const maxElements = 12; // stagger limit

  // 1. Budget checking
  let prunedSelectors = [...selectors];
  let budgetWarning = null;
  if (prunedSelectors.length > maxElements) {
    prunedSelectors = prunedSelectors.slice(0, maxElements);
    budgetWarning = `⚠️ Scroll Choreography group size pruned from ${selectors.length} to ${maxElements} to respect motion budget limits.`;
  }

  const theme = themeProfile || new ThemeProfile();
  const kineticWeight = intent.toLowerCase().includes('heavy') ? KineticWeight.HEAVY :
                        intent.toLowerCase().includes('grounded') ? KineticWeight.GROUNDED :
                        intent.toLowerCase().includes('light') ? KineticWeight.LIGHT :
                        intent.toLowerCase().includes('floating') ? KineticWeight.FLOATING : KineticWeight.BALANCED;

  const resolvedIntent = { kinetic_weight: kineticWeight, trigger: TriggerType.SCROLL };

  // Calculate stagger offsets based on mode
  prunedSelectors.forEach((selector, index) => {
    let delay = 0;
    let parallaxFactor = 0;

    if (mode === 'cascade') {
      const baseStagger = theme.tempo_scale < 0.8 ? 100 : 40; // milliseconds
      delay = index * baseStagger;
    } else if (mode === 'radial') {
      // Elements near the center start first
      const mid = (prunedSelectors.length - 1) / 2;
      const dist = Math.abs(index - mid);
      delay = dist * 60;
    } else if (mode === 'parallel-lanes') {
      // Even index left lane, odd index right lane
      delay = (index % 2) * 80;
      parallaxFactor = (index % 2 === 0 ? 1 : -1) * 0.1;
    } else if (mode === 'scrub') {
      // Linked direct to scroll percentages
      delay = index * 20; // represents starting scroll offset %
    }

    // Solve for TranslateY and Opacity
    const ySpring = solveAxis({
      axis: SpringAxis.TranslateY,
      intent: resolvedIntent,
      theme,
      selector,
      initial_value: mode === 'scrub' ? 80.0 : 40.0,
      target_value: 0.0
    });

    const opacitySpring = solveAxis({
      axis: SpringAxis.Opacity,
      intent: resolvedIntent,
      theme,
      selector,
      initial_value: 0.0,
      target_value: 1.0
    });

    finalTimeline.push({
      selector,
      delay_ms: delay,
      parallaxFactor,
      springs: {
        translateY: ySpring,
        opacity: opacitySpring
      }
    });
  });

  return {
    mode,
    timeline: finalTimeline,
    warning: budgetWarning,
    staggerScale: theme.tempo_scale
  };
}
