import { scanWorkspace } from '../context_scanner.js';
import { composePrimitives } from '../animation/interaction_composer.js';
import { writeMotionSpecToWorkspace } from '../compiler/motion_md.js';

export const name = 'generate_interaction_spec';
export const description = 'Generates non-repetitive micro-interactions by combining atomic motion primitives (translate, scale, rotate, opacity, shadow, blur, clip, skew).';

export const inputSchema = {
  type: 'object',
  properties: {
    selector: {
      type: 'string',
      description: 'CSS selector for the interactive element (e.g. \'.submit-btn\').'
    },
    trigger: {
      type: 'string',
      enum: ['hover', 'click', 'focus', 'drag', 'press'],
      description: 'The physical trigger event. Default: hover'
    },
    element_role: {
      type: 'string',
      enum: ['button', 'card', 'nav', 'hero', 'icon', 'form', 'media'],
      description: 'The structural role of the element.'
    },
    primitives: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Optional manual array of primitives to override auto-selection.'
    },
    intent: {
      type: 'string',
      description: 'Optional kinetic weight intent (heavy/grounded/balanced/light/floating).'
    },
    workspacePath: {
      type: 'string',
      description: 'Path to the user\'s project workspace.'
    }
  },
  required: ['selector', 'trigger']
};

export async function run(args) {
  const selector = args.selector;
  const trigger = args.trigger || 'hover';
  const role = args.element_role || 'button';
  const workspace = args.workspacePath || '.';

  const theme = scanWorkspace(workspace);
  const composition = composePrimitives(role, theme, selector);

  // Parse primitives list
  const primsList = Object.keys(composition);

  // Write interaction spec update to motion.md
  const interactionSpec = {
    selector,
    role,
    primitives: primsList
  };
  writeMotionSpecToWorkspace(workspace, null, theme, { interactionSpec });

  let snippet = `SUCCESS: Interaction primitive composition compiled for selector "${selector}".\n\n`;
  snippet += `- **Element Role**: ${role}\n`;
  snippet += `- **Trigger**: ${trigger}\n`;
  snippet += `- **Primitives Selected**: ${primsList.map(p => `\`${p}\``).join(', ')}\n\n`;
  snippet += `### Composition Breakdown:\n`;

  Object.entries(composition).forEach(([prim, data]) => {
    snippet += `- **${prim.toUpperCase()}**:\n`;
    Object.entries(data).forEach(([key, val]) => {
      snippet += `  - ${key}: ${val}\n`;
    });
  });

  snippet += `\n### CSS Snippet:\n\`\`\`css\n`;
  snippet += `${selector} {\n  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease;\n  will-change: transform, opacity;\n}\n`;

  if (composition.translate) {
    const axis = composition.translate.axis;
    snippet += `${selector}:${trigger} {\n  transform: ${axis === 'translateY' ? `translateY(${composition.translate.initial}px)` : `translateX(${composition.translate.initial}px)`};\n}\n`;
  }
  if (composition.scale) {
    snippet += `${selector}:${trigger} {\n  transform: scale(${composition.scale.target});\n}\n`;
  }
  if (composition.rotate) {
    snippet += `${selector}:${trigger} {\n  transform: rotate(${composition.rotate.target}deg);\n}\n`;
  }
  snippet += `\`\`\`\n`;

  return {
    content: [
      {
        type: 'text',
        text: snippet
      }
    ]
  };
}
