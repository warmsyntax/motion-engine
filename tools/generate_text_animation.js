import { scanWorkspace } from '../context_scanner.js';
import { generateTextAnimationCode } from '../integration/pretext_bridge.js';
import { writeMotionSpecToWorkspace } from '../compiler/motion_md.js';

export const name = 'generate_text_animation';
export const description = 'Choreographs layout-reflow-free character, word, or line-level text animations using Pretext or wrapper fallbacks.';

export const inputSchema = {
  type: 'object',
  properties: {
    selector: {
      type: 'string',
      description: 'CSS selector targeting the text container element (e.g. \'.hero-title\').'
    },
    split_by: {
      type: 'string',
      enum: ['character', 'word', 'line'],
      description: 'Granularity of text splitting. Default: word'
    },
    animation_style: {
      type: 'string',
      enum: ['reveal', 'cascade', 'typewriter', 'wave'],
      description: 'Style of the reveal effect. Default: reveal'
    },
    intent: {
      type: 'string',
      description: 'Optional kinetic weight intent (heavy/grounded/balanced/light/floating).'
    },
    direction: {
      type: 'string',
      enum: ['up', 'down', 'left', 'right'],
      description: 'Direction of transition offsets. Default: up'
    },
    use_pretext: {
      type: 'boolean',
      description: 'Force the use of @chenglou/pretext layout-free calculations.'
    },
    workspacePath: {
      type: 'string',
      description: 'Path to the user\'s project workspace.'
    }
  },
  required: ['selector']
};

export async function run(args) {
  const selector = args.selector;
  const splitBy = args.split_by || 'word';
  const animationStyle = args.animation_style || 'reveal';
  const direction = args.direction || 'up';
  const usePretext = args.use_pretext || false;
  const workspace = args.workspacePath || '.';

  const theme = scanWorkspace(workspace);
  const result = generateTextAnimationCode({
    selector,
    splitBy,
    animationStyle,
    direction,
    workspacePath: workspace,
    usePretext
  });

  // Write text spec update to motion.md
  const textSpec = {
    selector,
    split_by: splitBy,
    animation_style: animationStyle,
    direction,
    mode: result.mode
  };
  writeMotionSpecToWorkspace(workspace, null, theme, { textSpec });

  let outputText = `SUCCESS: Text animation code compiled for selector "${selector}".\n`;
  if (result.warning) {
    outputText += `\n⚠️ ${result.warning}\n`;
  }
  outputText += `\nMode: ${result.mode.toUpperCase()}\n\n`;
  outputText += `### HTML:\n\`\`\`html\n${result.html}\n\`\`\`\n\n`;
  outputText += `### CSS:\n\`\`\`css\n${result.css}\n\`\`\`\n\n`;
  outputText += `### Javascript:\n\`\`\`javascript\n${result.js}\n\`\`\`\n`;

  return {
    content: [
      {
        type: 'text',
        text: outputText
      }
    ]
  };
}
