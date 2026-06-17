import { assessMotionBudget } from '../budget/motion_budget.js';

export const name = 'assess_motion_budget';
export const description = 'Enforces a mathematical motion budget (limits active animated elements, concurrent springs, and decorative animation ratios).';

export const inputSchema = {
  type: 'object',
  properties: {
    workspacePath: {
      type: 'string',
      description: 'Path to the user\'s project workspace.'
    },
    url: {
      type: 'string',
      description: 'Optional live URL to analyze.'
    }
  }
};

export async function run(args) {
  const workspace = args.workspacePath || '.';

  console.error(`[motion-engine] Enforcing budget scan at: ${workspace}`);
  const report = assessMotionBudget(workspace);

  let output = `## MOTION BUDGET REPORT\n\n`;
  if (report.ok) {
    output += `🟢 BUDGET PASS: Animation density fits within perceptual safety limits.\n\n`;
  } else {
    output += `🔴 BUDGET OVERLOAD: Workspace animations exceed perceptual guidelines.\n\n`;
  }

  output += `- **Animated Elements**: ${report.elementCount} / 8 (Max)\n`;
  output += `- **Concurrent Springs**: ${report.concurrentSprings} / 4 (Max)\n`;
  output += `- **Decorative Ratio**: ${report.decorativeRatio}% / 30% (Max) (Decorative: ${report.decorativeCount}, Functional: ${report.functionalCount})\n`;
  output += `- **Max Pattern Repeats**: ${report.maxRepeats} / 2 (Max)\n\n`;

  if (report.warnings.length === 0) {
    output += `_Status: No budget warnings active._\n`;
  } else {
    output += `### Warnings:\n`;
    report.warnings.forEach(w => {
      output += `- ${w}\n`;
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
