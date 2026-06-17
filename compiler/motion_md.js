import fs from 'fs';
import path from 'path';
import { TypographyClass, MotionSpec, SpringParams } from '../types.js';

/**
 * Parses existing motion.md and extracts specs, text specs, and primitive specs.
 */
export function parseExistingMotionMd(mdContent) {
  const specs = [];
  const textSpecs = [];
  const interactionSpecs = [];

  if (!mdContent) return { specs, textSpecs, interactionSpecs };

  const lines = mdContent.split('\n');
  let currentSpec = null;
  let currentBlock = null;
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
      currentSection = line.replace(/^##\s*/, '').trim();
      continue;
    }

    // Parse physics blocks under Section 2
    if (currentSection && (currentSection.startsWith('2.') || currentSection.includes('PHYSICS'))) {
      if (line.startsWith('- **Target Element**:')) {
        if (currentSpec) {
          specs.push(currentSpec);
        }
        const target = line.split('`')[1] || line.split('**Target Element**:')[1].trim();
        currentSpec = {
          target_selector: target,
          source: 'solver',
          trigger_type: 'scroll',
          physics_blocks: [],
          purpose: 'delight'
        };
        currentBlock = null;
      }
      if (currentSpec) {
        if (line.startsWith('- **Source**:')) {
          currentSpec.source = line.split('**Source**:')[1].trim();
        }
        if (line.startsWith('- **Trigger Type**:')) {
          currentSpec.trigger_type = line.split('**Trigger Type**:')[1].trim();
        }
        if (line.startsWith('- **Purpose**:')) {
          currentSpec.purpose = line.split('**Purpose**:')[1].trim();
        }
        if (line.startsWith('### Axis/Property:')) {
          const axis = line.split('`')[1] || 'transform';
          currentBlock = {
            axis: axis,
            stiffness: 300,
            damping: 20,
            mass: 1,
            damping_ratio: 1,
            perceptual_duration_ms: 300,
            initial_value: 0,
            target_value: 0
          };
          currentSpec.physics_blocks.push(currentBlock);
        }
        if (currentBlock) {
          if (line.startsWith('stiffness:')) {
            currentBlock.stiffness = parseFloat(line.split(':')[1]) || 300;
          }
          if (line.startsWith('damping:')) {
            currentBlock.damping = parseFloat(line.split(':')[1]) || 20;
          }
          if (line.startsWith('mass:')) {
            currentBlock.mass = parseFloat(line.split(':')[1]) || 1;
          }
          if (line.startsWith('damping_ratio:')) {
            currentBlock.damping_ratio = parseFloat(line.split(':')[1]) || 1;
          }
          if (line.startsWith('perceptual_duration:')) {
            currentBlock.perceptual_duration_ms = parseInt(line.split(':')[1]) || 300;
          }
          if (line.startsWith('initial_value:')) {
            currentBlock.initial_value = parseFloat(line.split(':')[1]) || 0;
          }
          if (line.startsWith('target_value:')) {
            currentBlock.target_value = parseFloat(line.split(':')[1]) || 0;
          }
        }
      }
    }

    // Parse Text Animations under Section 8
    if (currentSection && (currentSection.startsWith('8.') || currentSection.includes('TEXT'))) {
      if (line.startsWith('- **Selector**:')) {
        const sel = line.split('`')[1] || line.split('**Selector**:')[1].trim();
        textSpecs.push({
          selector: sel,
          split_by: 'word',
          animation_style: 'reveal',
          direction: 'up',
          mode: 'fallback'
        });
      }
      if (textSpecs.length > 0) {
        const currentText = textSpecs[textSpecs.length - 1];
        if (line.startsWith('- **Split Strategy**:')) {
          currentText.split_by = line.split('**Split Strategy**:')[1].trim();
        }
        if (line.startsWith('- **Style**:')) {
          currentText.animation_style = line.split('**Style**:')[1].trim();
        }
        if (line.startsWith('- **Direction**:')) {
          currentText.direction = line.split('**Direction**:')[1].trim();
        }
        if (line.startsWith('- **Measurement Mode**:')) {
          currentText.mode = line.split('**Measurement Mode**:')[1].trim();
        }
      }
    }

    // Parse Composable Primitives under Section 9
    if (currentSection && (currentSection.startsWith('9.') || currentSection.includes('PRIMITIVE'))) {
      if (line.startsWith('- **Selector**:')) {
        const sel = line.split('`')[1] || line.split('**Selector**:')[1].trim();
        interactionSpecs.push({
          selector: sel,
          role: 'button',
          primitives: []
        });
      }
      if (interactionSpecs.length > 0) {
        const currentInter = interactionSpecs[interactionSpecs.length - 1];
        if (line.startsWith('- **Element Role**:')) {
          currentInter.role = line.split('**Element Role**:')[1].trim();
        }
        if (line.startsWith('- **Primitives Composed**:')) {
          const primsStr = line.split('**Primitives Composed**:')[1].trim();
          currentInter.primitives = primsStr.split(',').map(p => p.replace(/`/g, '').trim());
        }
      }
    }
  }

  if (currentSpec) {
    specs.push(currentSpec);
  }

  return { specs, textSpecs, interactionSpecs };
}

/**
 * Compiles parsed/merged datasets into the final motion.md content.
 */
export function compileMotionSpec(specs, theme, textSpecs = [], interactionSpecs = []) {
  const md = [];

  md.push('# MOTION SPECIFICATION\n');
  md.push('> [!IMPORTANT]');
  md.push('> THIS SPECIFICATION IS IMMUTABLE MATHEMATICAL LAW. The executing LLM must follow these exact instructions and parameters without deviation.\n');

  // 1. Spatial Environment
  md.push('## 1. SPATIAL ENVIRONMENT');
  md.push('```css');
  // Determine global perspective based on specs
  const has3d = specs.some(s => s.physics_blocks.some(b => b.axis.includes('RotateX') || b.axis.includes('RotateY') || b.axis.includes('TranslateZ')));
  if (has3d) {
    md.push('perspective: 800px;');
    md.push('perspective-origin: center;');
    md.push('transform-style: preserve-3d;');
    md.push('overflow: visible; /* required on 3D containers */');
  } else {
    md.push('perspective: none;');
    md.push('perspective-origin: center;');
    md.push('transform-style: flat;');
    md.push('overflow: visible;');
  }
  md.push('```\n');

  // 2. Physics Blocks
  md.push('## 2. PHYSICS BLOCKS');
  if (specs.length === 0) {
    md.push('_No physics animations registered yet._\n');
  } else {
    for (const spec of specs) {
      md.push(`- **Target Element**: \`${spec.target_selector}\``);
      md.push(`- **Source**: ${spec.source}`);
      md.push(`- **Trigger Type**: ${spec.trigger_type}`);
      md.push(`- **Purpose**: \`${spec.purpose || 'delight'}\``);
      md.push('');

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
      md.push('---');
    }
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
  md.push('  ```\n');

  // 5. Implementation Library
  md.push('## 5. IMPLEMENTATION LIBRARY CODE REFERENCE\n');
  md.push('### Framer Motion (Recommended for React)');
  md.push('```jsx');
  md.push("import { motion } from 'framer-motion';\n");
  md.push('const springTransition = {');
  md.push('  type: "spring",');
  if (specs.length > 0 && specs[0].physics_blocks.length > 0) {
    const first = specs[0].physics_blocks[0];
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
  if (specs.length > 0 && specs[0].physics_blocks.length > 0) {
    const first = specs[0].physics_blocks[0];
    md.push(`  duration: ${first.perceptual_duration_ms / 1000.0},`);
  } else {
    md.push('  duration: 0.4,');
  }
  md.push('  ease: "power3.out"');
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
  md.push('- **WCAG Guidelines Met**: WCAG 2.3.3, 2.2.2, and 2.3.1.\n');

  // 7. LLM Execution Guardrails
  md.push('## 7. LLM EXECUTION GUARDRAILS');
  md.push('1. **READ** this spec BEFORE writing any animation code.');
  md.push('2. **BAN** the use of `transition: all` and raw cubic-bezier values for primary elements.');
  md.push('3. **DO NOT** animate layout properties (e.g. `width`, `height`, `top`, `left`, `margin`, `padding`).');
  md.push('4. **MUST** apply spring physics variables from Section 2 directly.');
  md.push('5. **MUST** include media queries for `prefers-reduced-motion` compliance.');
  md.push('6. **MUST** apply `will-change: transform` to animated elements to promote to GPU layer.');
  md.push('7. **MUST** use the pseudo-element opacity trick for shadow transitions (never animate box-shadow directly).');
  md.push('8. **This specification is IMMUTABLE law.** Do not deviate under any circumstance.\n');

  // 8. Text Animations
  md.push('## 8. TEXT ANIMATIONS');
  if (textSpecs.length === 0) {
    md.push('_No text animations registered yet._\n');
  } else {
    for (const t of textSpecs) {
      md.push(`- **Selector**: \`${t.selector}\``);
      md.push(`  - **Split Strategy**: ${t.split_by}`);
      md.push(`  - **Style**: ${t.animation_style}`);
      md.push(`  - **Direction**: ${t.direction}`);
      md.push(`  - **Measurement Mode**: ${t.mode}`);
      md.push('');
    }
  }

  // 9. Composable Interaction Primitives
  md.push('## 9. COMPOSABLE INTERACTION PRIMITIVES');
  if (interactionSpecs.length === 0) {
    md.push('_No composable interaction specs registered yet._\n');
  } else {
    for (const inter of interactionSpecs) {
      md.push(`- **Selector**: \`${inter.selector}\``);
      md.push(`  - **Element Role**: ${inter.role}`);
      md.push(`  - **Primitives Composed**: ${inter.primitives.map(p => `\`${p}\``).join(', ')}`);
      md.push('');
    }
  }

  return md.join('\n');
}

/**
 * Parses existing file, merges new specifications, compiles and writes to workspace.
 */
export function writeMotionSpecToWorkspace(rootDir, newSpec = null, theme, { textSpec = null, interactionSpec = null } = {}) {
  const outPath = path.join(path.resolve(rootDir), 'motion.md');
  let existingContent = '';
  if (fs.existsSync(outPath)) {
    try {
      existingContent = fs.readFileSync(outPath, 'utf8');
    } catch (err) {
      // Ignore read error
    }
  }

  // Parse existing data
  const { specs, textSpecs, interactionSpecs } = parseExistingMotionMd(existingContent);

  // Merge new spring physics spec
  if (newSpec) {
    const idx = specs.findIndex(s => s.target_selector === newSpec.target_selector);
    if (idx !== -1) {
      specs[idx] = newSpec;
    } else {
      specs.push(newSpec);
    }
  }

  // Merge new text spec
  if (textSpec) {
    const idx = textSpecs.findIndex(t => t.selector === textSpec.selector);
    if (idx !== -1) {
      textSpecs[idx] = textSpec;
    } else {
      textSpecs.push(textSpec);
    }
  }

  // Merge new interaction spec
  if (interactionSpec) {
    const idx = interactionSpecs.findIndex(i => i.selector === interactionSpec.selector);
    if (idx !== -1) {
      interactionSpecs[idx] = interactionSpec;
    } else {
      interactionSpecs.push(interactionSpec);
    }
  }

  const compiledContent = compileMotionSpec(specs, theme, textSpecs, interactionSpecs);
  fs.writeFileSync(outPath, compiledContent, 'utf8');
  return compiledContent;
}
