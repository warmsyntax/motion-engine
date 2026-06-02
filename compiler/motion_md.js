import fs from 'fs';
import path from 'path';
import { TypographyClass } from '../types.js';

/// Compiles a MotionSpec into the raw markdown content for motion.md.
export function compileMotionSpec(spec, theme) {
  const md = [];

  md.push('# MOTION SPECIFICATION\n');
  md.push('> [!IMPORTANT]');
  md.push('> THIS SPECIFICATION IS IMMUTABLE MATHEMATICAL LAW. The executing LLM must follow these exact instructions and parameters without deviation.\n');

  // 1. Spatial Environment
  md.push('## 1. SPATIAL ENVIRONMENT');
  md.push('```css');
  if (spec.spatial_env.perspective_px) {
    md.push(`perspective: ${spec.spatial_env.perspective_px}px;`);
  } else {
    md.push('perspective: none;');
  }
  md.push(`perspective-origin: ${spec.spatial_env.perspective_origin};`);
  md.push(`transform-style: ${spec.spatial_env.transform_style};`);
  md.push(`overflow: ${spec.spatial_env.overflow}; /* required on 3D containers */`);
  md.push('```\n');

  // 2. Physics Block
  md.push('## 2. PHYSICS BLOCK');
  md.push(`- **Source**: ${spec.source}`);
  md.push(`- **Target Element**: \`${spec.target_selector}\``);
  md.push(`- **Trigger Type**: ${spec.trigger_type}\n`);

  for (const param of spec.physics_blocks) {
    md.push(`### Axis/Property: \`${param.axis}\``);
    md.push('```yaml');
    md.push(`stiffness: ${param.stiffness}`);
    md.push(`damping: ${param.damping}`);
    md.push(`mass: ${param.mass}`);
    md.push(`damping_ratio: ${param.damping_ratio} (${
      param.damping_ratio < 0.95 ? 'underdamped - bouncy' :
      param.damping_ratio > 1.05 ? 'overdamped - heavy' :
      'critically damped - optimal'
    })`);
    md.push(`perceptual_duration: ${param.perceptual_duration_ms}ms`);
    md.push(`initial_value: ${param.initial_value}`);
    md.push(`target_value: ${param.target_value}`);
    md.push('```\n');
  }

  // 3. Thematic Harmonization
  md.push('## 3. THEMATIC HARMONIZATION');
  md.push(`- **Typography Class**: ${theme.typography_class}`);
  md.push(`- **Brand Tempo Scale**: ${theme.tempo_scale}x`);

  // Constraints based on typography class
  md.push('- **Rotational Limits**: ' + (
    theme.typography_class === TypographyClass.SERIF
      ? 'Max rotation is strictly capped at **15deg** to preserve high-luxury serif legibility.'
      : theme.typography_class === TypographyClass.DISPLAY
      ? 'Rotation capped at **25deg** for large screen display aesthetics.'
      : 'Standard rotation bounds apply (cap at **45deg**).'
  ));

  // Stagger limits
  md.push('- **Stagger Limits**: ' + (
    theme.tempo_scale < 0.8
      ? 'Luxury tempo: stagger delay of **80ms-120ms** per child element is required.'
      : 'SaaS/Snappy tempo: stagger delay of **30ms-50ms** per child element.'
  ));

  // Color harmony design tokens
  if (theme.color_tokens && theme.color_tokens.length > 0) {
    md.push('- **Color Harmony**: Use these exact brand design tokens:');
    for (const token of theme.color_tokens) {
      md.push(`  - \`${token.name}\`: \`${token.value}\``);
    }
  }
  md.push('');

  // 4. Performance Mandates
  md.push('## 4. PERFORMANCE MANDATES');
  md.push('- **GPU Acceleration**: Animate **ONLY** `transform` and `opacity` properties.');
  md.push('- **Will-Change Strategy**: Apply `will-change: transform` before the animation starts and remove it immediately after settlement (`onAnimationComplete` or `onComplete`).');
  md.push('- **Box-Shadow Animation**: Animating `box-shadow` directly is **BANNED**. Use the pseudo-element opacity trick:');
  md.push('  ```css');
  md.push('  .target-element {');
  md.push('    position: relative;');
  md.push('    box-shadow: 0 2px 4px rgba(0,0,0,0.05); /* base */');
  md.push('  }');
  md.push('  .target-element::after {');
  md.push('    content: "";');
  md.push('    position: absolute;');
  md.push('    inset: 0;');
  md.push('    border-radius: inherit;');
  md.push('    box-shadow: 0 12px 40px rgba(0,0,0,0.15); /* target */');
  md.push('    opacity: 0;');
  md.push('    transition: opacity 0.3s ease;');
  md.push('    pointer-events: none;');
  md.push('  }');
  md.push('  .target-element:hover::after {');
  md.push('    opacity: 1; /* composted paint-free transition */');
  md.push('  }');
  md.push('  ```');

  if (spec.scroll_method) {
    md.push(`- **Scroll Method**: \`${spec.scroll_method}\` is recommended.`);
  }
  md.push('');

  // 5. Implementation Library
  md.push('## 5. IMPLEMENTATION LIBRARY CODE REFERENCE\n');
  md.push('### Framer Motion (Recommended for React)');
  md.push('```jsx');
  md.push("import { motion } from 'framer-motion';\n");
  md.push('const springTransition = {');
  md.push('  type: "spring",');
  if (spec.physics_blocks.length > 0) {
    const first = spec.physics_blocks[0];
    md.push(`  stiffness: ${first.stiffness},`);
    md.push(`  damping: ${first.damping},`);
    md.push(`  mass: ${first.mass},`);
  } else {
    md.push('  stiffness: 300,');
    md.push('  damping: 20,');
    md.push('  mass: 1,');
  }
  md.push('};\n');
  md.push('<motion.div');
  md.push('  animate={{ translateY: 0, opacity: 1 }}');
  md.push('  transition={springTransition}');
  md.push('/>');
  md.push('```\n');

  md.push('### GSAP Custom Spring (For Non-React/Vanilla Projects)');
  md.push('```javascript');
  md.push("import gsap from 'gsap';\n");
  md.push('// Standard damped oscillator solver used to create high-precision GSAP bezier ease');
  md.push('gsap.to(".target-element", {');
  md.push('  y: 0,');
  md.push('  opacity: 1,');
  if (spec.physics_blocks.length > 0) {
    const first = spec.physics_blocks[0];
    md.push(`  duration: ${first.perceptual_duration_ms / 1000.0},`);
  } else {
    md.push('  duration: 0.4,');
  }
  md.push('  ease: "power3.out" // CustomEase.create("spring", "...") approximation');
  md.push('});');
  md.push('```\n');

  // 6. Accessibility
  md.push('## 6. ACCESSIBILITY & WCAG COMPLIANCE');
  md.push('- **Reduced Motion Media Query**: Every animation must respect user operating system settings for motion minimization:');
  md.push('  ```css');
  md.push('  @media (prefers-reduced-motion: reduce) {');
  md.push('    .target-element {');
  md.push('      transition: none !important;');
  md.push('      transform: none !important;');
  md.push('      animation: none !important;');
  md.push('    }');
  md.push('  }');
  md.push('  ```');
  md.push('- **Vestibular Safety Limits**: Rotation is limited to safe angles (< 30deg), and translation distances are limited to avoid disorienting page shifts.');
  md.push('- **Flash Rates**: Checked safe (< 3 transitions per second).');
  md.push('- **Autoplay Rules**: Infinite looping or autonomous animations that last longer than 5 seconds **MUST** have user-facing controls to pause or stop.');
  md.push('- **WCAG Guidelines Met**: WCAG 2.3.3 (Animation from Interaction), 2.2.2 (Pause, Stop, Hide), and 2.3.1 (Three Flashes or Below Threshold).\n');

  // 7. LLM Execution Guardrails
  md.push('## 7. LLM EXECUTION GUARDRAILS');
  md.push('1. **READ** this spec file strictly before drafting any stylesheet or animation script.');
  md.push('2. **BAN** the use of `transition: all` and raw cubic-bezier values for primary elements.');
  md.push('3. **DO NOT** animate layout properties (e.g. `width`, `height`, `top`, `left`, `margin`, `padding`).');
  md.push('4. **MUST** apply spring physics variables from Section 2 directly.');
  md.push('5. **MUST** include media queries for `prefers-reduced-motion` compliance.');
  md.push('6. **MUST** apply `will-change: transform` to animated elements to promote to GPU layer.');
  md.push('7. **MUST** use the pseudo-element opacity trick for shadow transitions (never animate box-shadow directly).');
  md.push('8. **This specification is IMMUTABLE law.** Do not deviate under any circumstance.');

  return md.join('\n');
}

/// Saves the compiled motion specification as `motion.md` in the workspace root.
export function writeMotionSpecToWorkspace(rootDir, spec, theme) {
  const mdContent = compileMotionSpec(spec, theme);
  const outPath = path.join(path.resolve(rootDir), 'motion.md');
  fs.writeFileSync(outPath, mdContent, 'utf8');
  return mdContent;
}
