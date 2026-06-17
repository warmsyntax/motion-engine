import { scanWorkspace } from '../context_scanner.js';
import { choreographScroll } from '../animation/scroll_choreographer.js';
import { writeMotionSpecToWorkspace } from '../compiler/motion_md.js';

export const name = 'generate_scroll_choreography';
export const description = 'Generates scroll-driven animation timelines (staggered cascade, radial sweep, or scrubbed timeline) for a group of selectors.';

export const inputSchema = {
  type: 'object',
  properties: {
    selectors: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Array of CSS selectors to coordinate (e.g. [\'.card-1\', \'.card-2\', \'.card-3\']).'
    },
    url: {
      type: 'string',
      description: 'Optional reference website URL for analysis.'
    },
    mode: {
      type: 'string',
      enum: ['cascade', 'radial', 'parallel-lanes', 'scrub'],
      description: 'Choreography mode. Default: cascade'
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
  required: ['selectors']
};

export async function run(args) {
  const selectors = args.selectors;
  const mode = args.mode || 'cascade';
  const intent = args.intent || 'balanced';
  const workspace = args.workspacePath || '.';

  const theme = scanWorkspace(workspace);
  const result = choreographScroll({
    selectors,
    mode,
    intent,
    themeProfile: theme,
    workspacePath: workspace
  });

  // Cumulatively write/update each choreographed element spec in motion.md
  for (const item of result.timeline) {
    const mockSpec = {
      target_selector: item.selector,
      source: 'solver',
      trigger_type: mode === 'scrub' ? 'scroll_scrub' : 'scroll',
      physics_blocks: [
        item.springs.translateY,
        item.springs.opacity
      ],
      purpose: 'delight'
    };
    writeMotionSpecToWorkspace(workspace, mockSpec, theme);
  }

  let textOutput = `SUCCESS: Scroll choreography generated using "${mode}" mode.\n\n`;
  if (result.warning) {
    textOutput += `${result.warning}\n\n`;
  }

  textOutput += `### Stagger Timeline Mapping:\n`;
  result.timeline.forEach((item, i) => {
    textOutput += `${i + 1}. \`${item.selector}\` -> Delay: ${item.delay_ms}ms (TranslateY: stiffness=${item.springs.translateY.stiffness}, damping=${item.springs.translateY.damping})\n`;
  });

  textOutput += `\n### Framer Motion Stagger Implementation:\n\`\`\`jsx\n`;
  textOutput += `const containerVariants = {\n`;
  textOutput += `  hidden: {},\n`;
  textOutput += `  visible: {\n`;
  textOutput += `    transition: {\n`;
  textOutput += `      staggerChildren: ${theme.tempo_scale < 0.8 ? 0.1 : 0.04}\n`;
  textOutput += `    }\n`;
  textOutput += `  }\n`;
  textOutput += `};\n\n`;
  textOutput += `const itemVariants = {\n`;
  textOutput += `  hidden: { translateY: 40, opacity: 0 },\n`;
  textOutput += `  visible: {\n`;
  textOutput += `    translateY: 0,\n`;
  textOutput += `    opacity: 1,\n`;
  textOutput += `    transition: {\n`;
  textOutput += `      type: "spring",\n`;
  textOutput += `      stiffness: ${result.timeline[0].springs.translateY.stiffness},\n`;
  textOutput += `      damping: ${result.timeline[0].springs.translateY.damping}\n`;
  textOutput += `    }\n`;
  textOutput += `  }\n`;
  textOutput += `};\n`;
  textOutput += `\`\`\`\n`;

  return {
    content: [
      {
        type: 'text',
        text: textOutput
      }
    ]
  };
}
