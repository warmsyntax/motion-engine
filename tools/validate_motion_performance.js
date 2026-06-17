import { auditWorkspacePerformance } from '../validation/performance_auditor.js';

export const name = 'validate_motion_performance';
export const description = 'Audits the project workspace to identify rendering pipeline performance issues and accessibility anti-patterns.';

export const inputSchema = {
  type: 'object',
  properties: {
    workspacePath: {
      type: 'string',
      description: 'Path to the user\'s project workspace.'
    },
    url: {
      type: 'string',
      description: 'Optional live URL to audit (not used in static scans).'
    },
    fix_suggestions: {
      type: 'boolean',
      description: 'Include fix suggestions. Default: true'
    }
  }
};

export async function run(args) {
  const workspace = args.workspacePath || '.';
  const fixSuggestions = args.fix_suggestions !== false;

  console.error(`[motion-engine] Auditing workspace performance at: ${workspace}`);
  const report = auditWorkspacePerformance(workspace);

  let output = `## PERFORMANCE AUDIT REPORT\n\n`;
  if (report.ok) {
    output += `🟢 PASS: No critical layout-thrashing or animation performance issues found!\n\n`;
  } else {
    output += `🔴 WARNING: Detected performance anti-patterns in the workspace.\n\n`;
  }

  if (report.issues.length === 0) {
    output += `_No issues found in audited files._\n`;
  } else {
    // Group issues by file
    const fileGroups = {};
    report.issues.forEach(issue => {
      fileGroups[issue.file] = fileGroups[issue.file] || [];
      fileGroups[issue.file].push(issue);
    });

    Object.entries(fileGroups).forEach(([file, list]) => {
      output += `### File: \`${file}\`\n`;
      list.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' : '🟡';
        output += `- ${icon} **[${issue.rule}]** Line ${issue.line}: ${issue.message}\n`;
        if (fixSuggestions) {
          output += `  - *Suggestion*: ${getFixSuggestion(issue.rule)}\n`;
        }
      });
      output += '\n';
    });
  }

  return {
    content: [
      {
        type: 'text',
        text: output
      }
    ]
  };
}

function getFixSuggestion(rule) {
  switch (rule) {
    case 'Banned transition: all':
      return 'Replace "transition: all 0.3s ease" with specific properties, e.g. "transition: transform 0.3s ease, opacity 0.3s ease".';
    case 'Layout animation':
      return 'Animate "transform: scale()" or "transform: translate()" instead of modifying width/height/margin/padding.';
    case 'Banned box-shadow animation':
      return 'Use the pseudo-element opacity trick: pre-render shadow on ::after with opacity 0, then transition opacity.';
    case 'Scroll event animation handler':
      return 'Use IntersectionObserver to toggle classes or use CSS Scroll-Driven animations to run on the compositor thread.';
    case 'Layout thrashing inside rAF':
      return 'Compute measurements outside the animation loop, or bundle layouts using fastdom or requestAnimationFrame read/write splits.';
    case 'setTimeout/setInterval animation trigger':
      return 'Trigger updates inside requestAnimationFrame callbacks to align with the screen refresh rate.';
    case 'Missing prefers-reduced-motion fallback':
      return 'Add a CSS block targeting "@media (prefers-reduced-motion: reduce)" that resets all transitions and animations to none/0ms.';
    default:
      return 'Review rendering pipeline documentation to optimize compositor thread path.';
  }
}
