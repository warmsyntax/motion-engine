import fs from 'fs';
import path from 'path';

function findSrcFiles(dir, depth = 0, maxDepth = 4) {
  let results = [];
  if (depth > maxDepth) return results;

  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file !== 'node_modules' && !file.startsWith('.') && file !== 'dist' && file !== 'build') {
          results = results.concat(findSrcFiles(filePath, depth + 1, maxDepth));
        }
      } else {
        const ext = path.extname(file);
        if (['.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.vue', '.svelte'].includes(ext)) {
          results.push(filePath);
        }
      }
    }
  } catch (err) {
    // Ignore read errors
  }
  return results;
}

export function auditWorkspacePerformance(workspacePath = '.') {
  const issues = [];
  const files = findSrcFiles(path.resolve(workspacePath)).slice(0, 50); // limit scans

  let hasReducedMotionQuery = false;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(workspacePath, file);

      // Check for prefers-reduced-motion globally
      if (content.includes('prefers-reduced-motion')) {
        hasReducedMotionQuery = true;
      }

      // Check line-by-line metrics
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const lower = line.toLowerCase();

        // 1. Banned: transition: all
        if (lower.includes('transition:') && lower.includes('all')) {
          issues.push({
            file: relativePath,
            line: lineNum,
            severity: 'critical',
            rule: 'Banned transition: all',
            message: 'Detected "transition: all". This animates all layout properties and thrashes performance. Specify target properties explicitly (e.g. transform, opacity).'
          });
        }

        // 2. Animating layout properties
        if (lower.includes('transition:') && /(width|height|top|left|right|bottom|margin|padding)/.test(lower)) {
          issues.push({
            file: relativePath,
            line: lineNum,
            severity: 'critical',
            rule: 'Layout animation',
            message: 'Directly transitioning layout geometry properties (width, height, offsets, margins, paddings). Use GPU-accelerated "transform: translate/scale" instead.'
          });
        }

        // 3. Direct box-shadow transition
        if (lower.includes('transition:') && lower.includes('box-shadow')) {
          issues.push({
            file: relativePath,
            line: lineNum,
            severity: 'warning',
            rule: 'Banned box-shadow animation',
            message: 'Transitioning box-shadow directly triggers CPU repaint cascades. Implement the ::after pseudo-element opacity transition trick.'
          });
        }

        // 4. Scroll event listener
        if (lower.includes("addeventlistener('scroll'") || lower.includes('addeventlistener("scroll"') || lower.includes('.onscroll')) {
          issues.push({
            file: relativePath,
            line: lineNum,
            severity: 'critical',
            rule: 'Scroll event animation handler',
            message: 'Subscribing directly to scroll events for animating layouts thrashes the main thread. Use IntersectionObserver or CSS scroll-driven timeline APIs.'
          });
        }

        // 5. Layout thrashing inside loops/rAF
        if (lower.includes('requestanimationframe') && (lower.includes('offsetwidth') || lower.includes('getboundingclientrect') || lower.includes('clientheight'))) {
          issues.push({
            file: relativePath,
            line: lineNum,
            severity: 'critical',
            rule: 'Layout thrashing inside rAF',
            message: 'Reading layout properties (offsetWidth, getBoundingClientRect) inside requestAnimationFrame. This forces synchronous layouts every single frame.'
          });
        }

        // 9. setTimeout/setInterval for animation
        if ((lower.includes('settimeout') || lower.includes('setinterval')) && (lower.includes('transform') || lower.includes('opacity') || lower.includes('translate'))) {
          issues.push({
            file: relativePath,
            line: lineNum,
            severity: 'warning',
            rule: 'setTimeout/setInterval animation trigger',
            message: 'Timer intervals are not synchronized to display refresh rates. Use requestAnimationFrame for smooth spring integration.'
          });
        }
      });
    } catch (err) {
      // Ignore reading issues for individual files
    }
  }

  // 8. Missing prefers-reduced-motion check across files scanned
  if (files.length > 0 && !hasReducedMotionQuery) {
    issues.push({
      file: 'Global Context',
      line: 0,
      severity: 'critical',
      rule: 'Missing prefers-reduced-motion fallback',
      message: 'No "prefers-reduced-motion" CSS media query or JS matchMedia query detected in workspace. Awwwards-grade motion must respect user accessibility settings.'
    });
  }

  return {
    ok: issues.filter(i => i.severity === 'critical').length === 0,
    issues
  };
}
