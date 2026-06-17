import fs from 'fs';
import path from 'path';

export function parseActiveMotionSpecs(workspacePath) {
  const specs = [];
  try {
    const motionMdPath = path.resolve(workspacePath, 'motion.md');
    if (!fs.existsSync(motionMdPath)) {
      return specs;
    }

    const content = fs.readFileSync(motionMdPath, 'utf8');
    const lines = content.split('\n');

    let inPhysicsSection = false;
    let currentTarget = null;
    let currentPurpose = 'delight'; // fallback

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect ## section headers (but NOT ### sub-headers)
      if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
        const heading = trimmed.replace(/^##\s*/, '').trim();
        inPhysicsSection = heading.startsWith('2. PHYSICS BLOCK') ||
                           heading.startsWith('PHYSICS BLOCK');
        if (!inPhysicsSection) {
          // Reset state when leaving PHYSICS section
          currentTarget = null;
          currentPurpose = 'delight';
        }
        continue;
      }

      if (!inPhysicsSection) continue;

      if (trimmed.startsWith('- **Target Element**:')) {
        currentTarget = trimmed.split('`')[1] || trimmed.split('**Target Element**:')[1].trim();
      }
      if (trimmed.startsWith('- **Purpose**:') || (trimmed.startsWith('- **') && trimmed.toLowerCase().includes('purpose:'))) {
        currentPurpose = trimmed.split(':').slice(1).join(':').replace(/`/g, '').trim();
      }
      if (trimmed.startsWith('### Axis/Property:') || trimmed.startsWith('### Axis:')) {
        const axis = trimmed.split('`')[1] || 'transform';
        specs.push({
          target: currentTarget || 'unknown',
          axis: axis,
          purpose: currentPurpose
        });
      }
    }
  } catch (err) {
    // Ignore issues
  }
  return specs;
}

export function assessMotionBudget(workspacePath) {
  const specs = parseActiveMotionSpecs(workspacePath);

  // Group specs by target element to calculate unique elements
  const uniqueElements = new Set(specs.map(s => s.target));
  const elementCount = uniqueElements.size;

  // Concurrent spring animations (approximate by total active axes)
  const concurrentSprings = specs.length;

  // Decorative vs Functional ratio
  // Purposes: feedback, orientation, attention, delight (decorative), status
  const decorativeCount = specs.filter(s => s.purpose === 'delight' || s.purpose === 'decorative').length;
  const functionalCount = specs.length - decorativeCount;
  const decorativeRatio = specs.length > 0 ? (decorativeCount / specs.length) * 100 : 0;

  // Check for repeated identical patterns
  const patternCounts = {};
  specs.forEach(s => {
    const patternKey = `${s.axis}_${s.purpose}`;
    patternCounts[patternKey] = (patternCounts[patternKey] || 0) + 1;
  });
  const maxRepeats = Math.max(0, ...Object.values(patternCounts));

  const limits = {
    maxElements: 8,
    maxSprings: 4,
    maxStagger: 12,
    maxRepeats: 2,
    maxDecorativeRatio: 30
  };

  const report = {
    elementCount,
    concurrentSprings,
    decorativeCount,
    functionalCount,
    decorativeRatio: Math.round(decorativeRatio * 10) / 10,
    maxRepeats,
    warnings: [],
    ok: true
  };

  if (elementCount > limits.maxElements) {
    report.warnings.push(`🔴 Element Limit Exceeded: ${elementCount}/${limits.maxElements} animated elements active in viewport. Budget overloaded.`);
    report.ok = false;
  }
  if (concurrentSprings > limits.maxSprings) {
    report.warnings.push(`🔴 Concurrent Spring Limit Exceeded: ${concurrentSprings}/${limits.maxSprings} concurrent spring solvers. Potential layer layout jank.`);
    report.ok = false;
  }
  if (decorativeRatio > limits.maxDecorativeRatio) {
    report.warnings.push(`🟡 Decorative Motion Overhead: ${report.decorativeRatio}% of animations are decorative (limit ${limits.maxDecorativeRatio}%).`);
    report.ok = false;
  }
  if (maxRepeats > limits.maxRepeats) {
    report.warnings.push(`🟡 Repeated Motion Pattern: One or more motion specs are copied ${maxRepeats} times. Vary triggers or spring variables.`);
    report.ok = false;
  }

  return report;
}
