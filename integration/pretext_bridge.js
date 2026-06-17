import fs from 'fs';
import path from 'path';

/**
 * Checks if `@chenglou/pretext` is installed in the project's package.json.
 */
export function isPretextAvailable(workspacePath) {
  try {
    const pkgPath = path.resolve(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};
      return !!(deps['@chenglou/pretext'] || devDeps['@chenglou/pretext']);
    }
  } catch (err) {
    // Ignore issues
  }
  return false;
}

/**
 * Generates animation snippets for text reveals.
 */
export function generateTextAnimationCode({
  selector,
  splitBy = 'word',
  animationStyle = 'reveal',
  direction = 'up',
  workspacePath = '.',
  usePretext = false
}) {
  const isAvailable = usePretext || isPretextAvailable(workspacePath);

  if (isAvailable) {
    return {
      mode: 'pretext',
      warning: null,
      html: `<!-- Pretext expects a single text container element -->\n<div class="${selector.replace(/^\./, '')}">Your text here</div>`,
      css: `
${selector} {
  display: block;
  position: relative;
  overflow: hidden;
}

${selector} .pretext-line {
  overflow: hidden;
  display: inline-block;
  vertical-align: top;
}

${selector} .pretext-word {
  display: inline-block;
  will-change: transform;
}
`,
      js: `
import { prepare, layout } from '@chenglou/pretext';
import gsap from 'gsap';

const container = document.querySelector('${selector}');
const text = container.textContent;

// 1. Prepare text measurement using canvas contexts without DOM layout thrashing
const font = window.getComputedStyle(container).font;
const prepared = prepare({ text, font });

// 2. Perform arithmetic layout bounds mapping
const width = container.clientWidth;
const layoutResult = layout({ prepared, width });

// 3. Rebuild text node elements cleanly
container.innerHTML = '';
layoutResult.lines.forEach(line => {
  const lineEl = document.createElement('span');
  lineEl.className = 'pretext-line';
  
  line.words.forEach(word => {
    const wordEl = document.createElement('span');
    wordEl.className = 'pretext-word';
    wordEl.textContent = word.text + ' ';
    lineEl.appendChild(wordEl);
  });
  
  container.appendChild(lineEl);
});

// 4. Stagger entry based on measured line layout calculations
gsap.from('${selector} .pretext-word', {
  y: ${direction === 'up' ? '100' : '-100'}%,
  opacity: 0,
  stiffness: 300,
  damping: 24,
  mass: 1,
  stagger: {
    each: 0.04,
    from: "start"
  }
});
`
    };
  }

  // Fallback variant
  return {
    mode: 'fallback',
    warning: 'RECOMMENDED: Install @chenglou/pretext for layout-reflow-free character measurements.',
    html: `<div class="${selector.replace(/^\./, '')}">\n  <!-- Wrap characters/words manually or with standard split helpers -->\n</div>`,
    css: `
${selector} {
  overflow: hidden;
}
${selector} .split-unit {
  display: inline-block;
  will-change: transform;
}
`,
    js: `
// Fallback manual DOM splitter (Warning: Triggers layout/reflow getBoundingClientRect)
const container = document.querySelector('${selector}');
const words = container.textContent.split(' ');
container.innerHTML = words.map(w => \`<span class="split-unit">\${w}</span> \`).join('');

import gsap from 'gsap';
gsap.from('${selector} .split-unit', {
  y: ${direction === 'up' ? '20' : '-20'},
  opacity: 0,
  duration: 0.4,
  stagger: 0.02,
  ease: 'power2.out'
});
`
  };
}
