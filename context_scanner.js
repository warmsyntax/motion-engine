import fs from 'fs';
import path from 'path';
import { ThemeProfile, TypographyClass } from './types.js';
import { scanForHallmarkDesign, getHallmarkThematicModifications } from './integration/hallmark_bridge.js';

/// Helper to recursively find CSS files in a directory up to a specific depth
function findCssFiles(dir, depth = 0, maxDepth = 3) {
  let results = [];
  if (depth > maxDepth) return results;

  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and dot folders
        if (file !== 'node_modules' && !file.startsWith('.')) {
          results = results.concat(findCssFiles(filePath, depth + 1, maxDepth));
        }
      } else if (file.endsWith('.css')) {
        results.push(filePath);
      }
    }
  } catch (err) {
    // Ignore read errors
  }
  return results;
}

/// Helper to count occurrences of substrings in a string
function countSubstrings(haystack, needles) {
  let count = 0;
  const lower = haystack.toLowerCase();
  for (const needle of needles) {
    let pos = lower.indexOf(needle);
    while (pos !== -1) {
      count++;
      pos = lower.indexOf(needle, pos + 1);
    }
  }
  return count;
}

/// Parses the local workspace directory and returns a ThemeProfile.
export function scanWorkspace(rootDir = '.') {
  let profile = new ThemeProfile();
  const root = path.resolve(rootDir);

  // 1. Scan client_brief.md or design_system.md
  const briefFiles = ['client_brief.md', 'design_system.md', 'client-brief.md', 'design-system.md'];
  for (const brief of briefFiles) {
    const p = path.join(root, brief);
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        profile = parseBriefContent(content, profile);
      } catch (err) {
        // Ignore read errors
      }
    }
  }

  // 2. Scan tailwind.config files
  const tailwindFiles = ['tailwind.config.js', 'tailwind.config.ts'];
  for (const tw of tailwindFiles) {
    const p = path.join(root, tw);
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        profile = parseTailwindConfig(content, profile);
      } catch (err) {
        // Ignore read errors
      }
    }
  }

  // 3. Scan theme.json
  const themeJson = path.join(root, 'theme.json');
  if (fs.existsSync(themeJson)) {
    try {
      const content = fs.readFileSync(themeJson, 'utf8');
      profile = parseThemeJson(content, profile);
    } catch (err) {
      // Ignore read errors
    }
  }

  // 4. Scan CSS files for CSS variables (limit to first 10 files)
  const cssFiles = findCssFiles(root).slice(0, 10);
  for (const cssFile of cssFiles) {
    try {
      const content = fs.readFileSync(cssFile, 'utf8');
      profile = parseCssVars(content, profile);
    } catch (err) {
      // Ignore read errors
    }
  }

  // 5. Integrate Hallmark design overrides
  const hallmarkProfile = scanForHallmarkDesign(rootDir);
  if (hallmarkProfile) {
    const mods = getHallmarkThematicModifications(hallmarkProfile);
    profile.tempo_scale = mods.tempoScale;
    profile.stiffness_override_cap = mods.stiffnessCap;
    profile.damping_override_min = mods.dampingMin;
    if (hallmarkProfile.type_pairing) {
      const ty = hallmarkProfile.type_pairing.toLowerCase();
      if (ty.includes('serif')) {
        profile.typography_class = TypographyClass.SERIF;
      } else if (ty.includes('display')) {
        profile.typography_class = TypographyClass.DISPLAY;
      } else if (ty.includes('sans')) {
        profile.typography_class = TypographyClass.SANS_SERIF;
      }
    }
  }

  return profile;
}

function parseBriefContent(content, profile) {
  const lower = content.toLowerCase();

  // Typography class heuristic
  if (lower.includes('serif') || lower.includes('playfair') || lower.includes('georgia') || lower.includes('editorial')) {
    profile.typography_class = TypographyClass.SERIF;
  } else if (lower.includes('display') || lower.includes('clash display') || lower.includes('monument')) {
    profile.typography_class = TypographyClass.DISPLAY;
  } else if (lower.includes('sans') || lower.includes('inter') || lower.includes('roboto')) {
    profile.typography_class = TypographyClass.SANS_SERIF;
  }

  // Font weight heuristic
  if (lower.includes('bold') || lower.includes('heavy') || lower.includes('black')) {
    profile.font_weight = 700;
  } else if (lower.includes('light') || lower.includes('thin')) {
    profile.font_weight = 300;
  }

  // Brand tempo scale heuristic
  const luxuryScore = countSubstrings(lower, ['luxury', 'premium', 'slow', 'editorial', 'elegant', 'heritage']);
  const saasScore = countSubstrings(lower, ['saas', 'dashboard', 'fast', 'snappy', 'productive', 'developer', 'clean']);

  if (luxuryScore > saasScore) {
    profile.tempo_scale = 0.6; // luxury = slower, graceful
  } else if (saasScore > luxuryScore) {
    profile.tempo_scale = 1.2; // SaaS = snappier, productive
  } else {
    profile.tempo_scale = 1.0;
  }

  return profile;
}

function parseTailwindConfig(content, profile) {
  // Regex to extract colors: 'primary': '#ff0055' or "secondary": "rgb(0,0,0)"
  const reColor = /['"]([a-zA-Z0-9_-]+)['"]\s*:\s*['"](#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))['"]/g;
  let match;
  while ((match = reColor.exec(content)) !== null) {
    const name = match[1];
    const value = match[2];
    if (!profile.color_tokens.some(t => t.name === name)) {
      profile.color_tokens.push({ name, value });
    }
  }
  return profile;
}

function parseThemeJson(content, profile) {
  // WordPress schema slug-color pattern
  const reSlugColor = /"slug"\s*:\s*"([^"]+)"\s*,\s*"color"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = reSlugColor.exec(content)) !== null) {
    const name = match[1];
    const value = match[2];
    if (!profile.color_tokens.some(t => t.name === name)) {
      profile.color_tokens.push({ name, value });
    }
  }
  return profile;
}

function parseCssVars(content, profile) {
  // Match standard CSS variables like --color-primary: #112233;
  const reVar = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}\n]+)/g;
  let match;
  while ((match = reVar.exec(content)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    if (name.includes('color') || name.includes('primary') || name.includes('secondary') || name.includes('bg') || name.includes('text')) {
      if (!profile.color_tokens.some(t => t.name === name)) {
        profile.color_tokens.push({ name, value });
      }
    }
  }
  return profile;
}
