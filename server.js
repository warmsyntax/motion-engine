import * as generateMotionSpec from './tools/generate_motion_spec.js';
import * as generateTextAnimation from './tools/generate_text_animation.js';
import * as generateInteractionSpec from './tools/generate_interaction_spec.js';
import * as generateScrollChoreography from './tools/generate_scroll_choreography.js';
import * as validateMotionPerformance from './tools/validate_motion_performance.js';
import * as assessMotionBudget from './tools/assess_motion_budget.js';

// Static Tool Registry
const toolsRegistry = {
  [generateMotionSpec.name]: generateMotionSpec,
  [generateTextAnimation.name]: generateTextAnimation,
  [generateInteractionSpec.name]: generateInteractionSpec,
  [generateScrollChoreography.name]: generateScrollChoreography,
  [validateMotionPerformance.name]: validateMotionPerformance,
  [assessMotionBudget.name]: assessMotionBudget
};

// Static Prompts Registry
const promptsRegistry = {
  motion_intent: {
    name: 'motion_intent',
    description: 'Three-question interactive workflow to establish the kinetic weight, trigger geometry, and spatial plane of an animation.',
    arguments: [
      {
        name: 'kinetic_weight',
        description: 'stiffness/damping profile: heavy, grounded, balanced, light, floating',
        required: true
      },
      {
        name: 'trigger_geometry',
        description: 'trigger system: scroll, hover, time, scroll-scrub, click',
        required: true
      },
      {
        name: 'spatial_plane',
        description: '3D dimensions: 2d, 2.5d',
        required: true
      }
    ]
  },
  design_audit: {
    name: 'design_audit',
    description: 'Four-question guided design context and framework audit.',
    arguments: [
      {
        name: 'project_type',
        description: 'Landing / SaaS / E-commerce / Portfolio / Blog',
        required: true
      },
      {
        name: 'brand_personality',
        description: 'Playful / Professional / Luxurious / Minimal / Bold',
        required: true
      },
      {
        name: 'framework',
        description: 'React / Vue / Svelte / Vanilla / Astro / Next.js',
        required: true
      },
      {
        name: 'animations',
        description: 'Scroll reveals / Hover effects / Page transitions / Text animations / All',
        required: true
      }
    ]
  },
  component_motion: {
    name: 'component_motion',
    description: 'Quick three-question assistant for component-level motion specifications.',
    arguments: [
      {
        name: 'component',
        description: 'Button / Card / Modal / Nav / Hero / Form / Toast / Dropdown',
        required: true
      },
      {
        name: 'trigger',
        description: 'Hover / Click / Scroll / Mount / Focus',
        required: true
      },
      {
        name: 'feel',
        description: 'Snappy / Smooth / Bouncy / Heavy / Floating',
        required: true
      }
    ]
  }
};

/// Main JSON-RPC request dispatcher for the Model Context Protocol (MCP) server.
export async function handleMcpRequest(reqVal) {
  const id = reqVal.id;
  const method = reqVal.method;

  if (!method) {
    return {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: missing method' }
    };
  }

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            prompts: {}
          },
          serverInfo: {
            name: 'motion-engine-mcp',
            version: '2.0.0'
          }
        }
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: Object.values(toolsRegistry).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        }
      };

    case 'tools/call': {
      const params = reqVal.params || {};
      const toolName = params.name;
      const argumentsVal = params.arguments || {};

      const tool = toolsRegistry[toolName];
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` }
        };
      }

      try {
        const result = await tool.run(argumentsVal);
        return {
          jsonrpc: '2.0',
          id,
          result
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: `Tool execution failed: ${err.message}` }
        };
      }
    }

    case 'prompts/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          prompts: Object.values(promptsRegistry)
        }
      };

    case 'prompts/get': {
      const params = reqVal.params || {};
      const promptName = params.name;
      const argumentsVal = params.arguments || {};

      const promptObj = promptsRegistry[promptName];
      if (!promptObj) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown prompt: ${promptName}` }
        };
      }

      let instruction = '';
      if (promptName === 'motion_intent') {
        const weight = argumentsVal.kinetic_weight || 'balanced';
        const geom = argumentsVal.trigger_geometry || 'scroll';
        const plane = argumentsVal.spatial_plane || '2d';
        instruction = `Please generate a motion specification with these parameters:\n- Kinetic Weight: ${weight}\n- Trigger Geometry: ${geom}\n- Spatial Plane: ${plane}\n\nYou can pass this intent as arguments to the \`generate_motion_spec\` tool!`;
      } else if (promptName === 'design_audit') {
        const pType = argumentsVal.project_type || 'Landing';
        const brand = argumentsVal.brand_personality || 'Professional';
        const frame = argumentsVal.framework || 'React';
        const anims = argumentsVal.animations || 'All';
        instruction = `Establish motion DNA for a ${brand} ${pType} project in ${frame}. Focus on ${anims}.\nUse \`validate_motion_performance\` to audit code.`;
      } else if (promptName === 'component_motion') {
        const comp = argumentsVal.component || 'Button';
        const trig = argumentsVal.trigger || 'Hover';
        const feel = argumentsVal.feel || 'Smooth';
        instruction = `Generate custom spring spec for component "${comp}" triggered by "${trig}" with a "${feel}" animation curve.\nUse \`generate_interaction_spec\` for composition.`;
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          description: promptObj.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: instruction
              }
            }
          ]
        }
      };
    }

    default:
      if (method.startsWith('notifications/')) {
        console.error(`[motion-engine] Received notification: ${method} (acknowledged, no response sent)`);
        return null;
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unsupported method: ${method}` }
      };
  }
}
