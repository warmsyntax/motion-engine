import { scanWorkspace } from '../context_scanner.js';
import { runTelemetry } from '../telemetry/index.js';
import { solveScrollReveal, solveHoverLift } from '../physics/spring_solver.js';
import { fitAxisTelemetry } from '../physics/spring_fitter.js';
import { writeMotionSpecToWorkspace } from '../compiler/motion_md.js';
import { 
  MotionSpec, 
  SpatialPlane, 
  KineticWeight, 
  TriggerType, 
  SpringAxis, 
  SpatialEnvironment 
} from '../types.js';

export const name = 'generate_motion_spec';
export const description = 'Scrapes a reference URL or uses the Hooke\'s Law physics solver to compile an Awwwards-level motion.md spec with spring parameters and performance guardrails.';

export const inputSchema = {
  type: 'object',
  properties: {
    selector: {
      type: 'string',
      description: 'CSS selector targeting the animated element (e.g. \'.hero-card\' or \'button.pay\').'
    },
    url: {
      type: 'string',
      description: 'Optional reference website URL to extract real animation telemetry physics.'
    },
    intent: {
      type: 'string',
      description: 'Optional kinetic weight intent (heavy/grounded/balanced/light/floating).'
    },
    output_library: {
      type: 'string',
      description: 'Optional target library (framer-motion/gsap/css-native).'
    },
    element_type: {
      type: 'string',
      description: 'Optional element type (button/card/nav/hero/icon/form/media).'
    },
    stagger_count: {
      type: 'number',
      description: 'Optional number of sibling elements for stagger timing.'
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
  const urlOpt = args.url;
  const intentOpt = args.intent;
  const workspace = args.workspacePath || '.';
  const library = args.output_library || 'framer-motion';

  console.error(`[motion-engine] Scanning local workspace: ${workspace}`);
  const theme = scanWorkspace(workspace);

  let spec = new MotionSpec({
    target_selector: selector,
    source: 'solver',
    spatial_env: new SpatialEnvironment(),
    physics_blocks: [],
    thematic_rules: [],
    trigger_type: TriggerType.SCROLL,
    implementation_library: library,
    scroll_method: 'IntersectionObserver'
  });

  let telemetrySuccess = false;
  if (urlOpt) {
    console.error(`[motion-engine] Launching Puppeteer telemetry for URL: ${urlOpt}`);
    try {
      const { frames, trigger } = await runTelemetry(urlOpt, selector);
      spec.source = 'telemetry';
      spec.trigger_type = trigger;

      const fittedBlocks = [];
      const yFit = fitAxisTelemetry(frames, SpringAxis.TranslateY, theme);
      if (yFit) fittedBlocks.push(yFit);

      const opFit = fitAxisTelemetry(frames, SpringAxis.Opacity, theme);
      if (opFit) fittedBlocks.push(opFit);

      if (fittedBlocks.length > 0) {
        spec.physics_blocks = fittedBlocks;
        telemetrySuccess = true;
      }
    } catch (err) {
      console.error(`[motion-engine] Telemetry fallback: ${err.message}`);
    }
  }

  if (!telemetrySuccess) {
    const lIntent = (intentOpt || 'balanced').toLowerCase();
    let kinetic_weight = KineticWeight.BALANCED;
    if (lIntent.includes('heavy')) kinetic_weight = KineticWeight.HEAVY;
    else if (lIntent.includes('grounded')) kinetic_weight = KineticWeight.GROUNDED;
    else if (lIntent.includes('light')) kinetic_weight = KineticWeight.LIGHT;
    else if (lIntent.includes('floating')) kinetic_weight = KineticWeight.FLOATING;

    const trigger = (selector.includes('btn') || selector.includes('button') || selector.includes('card') || selector.includes('hover'))
      ? TriggerType.HOVER
      : TriggerType.SCROLL;

    const spatial_plane = (lIntent.includes('3d') || lIntent.includes('depth') || lIntent.includes('2.5d'))
      ? SpatialPlane.DEPTH
      : SpatialPlane.FLAT;

    const intentVal = { kinetic_weight, trigger, spatial_plane };
    spec.trigger_type = trigger;

    if (trigger === TriggerType.HOVER) {
      spec.physics_blocks = solveHoverLift(intentVal, theme, selector);
    } else {
      spec.physics_blocks = solveScrollReveal(intentVal, theme, selector);
    }

    if (spatial_plane === SpatialPlane.DEPTH) {
      spec.spatial_env = {
        perspective_px: 800,
        perspective_origin: 'center',
        transform_style: 'preserve-3d',
        overflow: 'visible'
      };
    }
  }

  const mdContent = writeMotionSpecToWorkspace(workspace, spec, theme);

  return {
    content: [
      {
        type: 'text',
        text: `SUCCESS: Core spec generated/updated for selector "${selector}".\n\n\`\`\`markdown\n${mdContent}\n\`\`\``
      }
    ]
  };
}
