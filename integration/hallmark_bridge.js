import fs from 'fs';
import path from 'path';
import { TypographyClass } from '../types.js';

export function scanForHallmarkDesign(workspacePath) {
  const profile = {
    macrostructure: null,
    type_pairing: null,
    colour_anchor: null,
    theme_fingerprint: null,
    theme: 'default'
  };

  try {
    const designMdPath = path.resolve(workspacePath, 'design.md');
    if (!fs.existsSync(designMdPath)) {
      return null;
    }

    const content = fs.readFileSync(designMdPath, 'utf8');
    const lines = content.split('\n');

    let currentSection = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        // Parse section header
        const heading = trimmed.replace(/^#+\s*/, '').toLowerCase();
        if (heading.includes('macrostructure')) {
          currentSection = 'macrostructure';
        } else if (heading.includes('type-pairing') || heading.includes('typography')) {
          currentSection = 'type_pairing';
        } else if (heading.includes('colour') || heading.includes('color')) {
          currentSection = 'colour_anchor';
        } else if (heading.includes('fingerprint') || heading.includes('theme')) {
          currentSection = 'theme_fingerprint';
        } else {
          currentSection = null;
        }
        continue;
      }

      if (!currentSection) continue;

      // Extract list items or values
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const val = trimmed.replace(/^[-*]\s*/, '').trim();
        if (currentSection === 'macrostructure') {
          profile.macrostructure = val;
        } else if (currentSection === 'type_pairing') {
          profile.type_pairing = val;
        } else if (currentSection === 'colour_anchor') {
          profile.colour_anchor = val;
        } else if (currentSection === 'theme_fingerprint') {
          profile.theme_fingerprint = val;
        }
      } else if (trimmed && !trimmed.startsWith('#')) {
        if (currentSection === 'theme_fingerprint') {
          profile.theme_fingerprint = trimmed;
        }
      }
    }
  } catch (err) {
    // Ignore issues
  }

  return profile;
}

/**
 * Returns Hallmark theme-specific spring/tempo modifications.
 */
export function getHallmarkThematicModifications(hallmarkProfile) {
  const mods = {
    tempoScale: 1.0,
    stiffnessCap: 500,
    dampingMin: 15,
    suggestedChoreography: 'cascade'
  };

  if (!hallmarkProfile) return mods;

  // Map macrostructures
  if (hallmarkProfile.macrostructure) {
    const macro = hallmarkProfile.macrostructure.toLowerCase();
    if (macro.includes('asymmetric') || macro.includes('grid')) {
      mods.suggestedChoreography = 'radial';
    } else if (macro.includes('editorial') || macro.includes('column')) {
      mods.suggestedChoreography = 'cascade';
    } else if (macro.includes('minimal')) {
      mods.suggestedChoreography = 'parallel-lanes';
    }
  }

  // Map type pairing
  if (hallmarkProfile.type_pairing) {
    const typography = hallmarkProfile.type_pairing.toLowerCase();
    if (typography.includes('serif') || typography.includes('playfair')) {
      mods.stiffnessCap = 200;
      mods.dampingMin = 25;
      mods.tempoScale = 0.7; // slower and graceful
    } else if (typography.includes('display')) {
      mods.stiffnessCap = 250;
      mods.dampingMin = 20;
      mods.tempoScale = 0.8;
    }
  }

  // Map theme fingerprints/names
  if (hallmarkProfile.theme_fingerprint) {
    const theme = hallmarkProfile.theme_fingerprint.toLowerCase();
    if (theme.includes('lux') || theme.includes('editorial') || theme.includes('classic')) {
      mods.tempoScale = 0.6;
    } else if (theme.includes('saas') || theme.includes('fast') || theme.includes('dev')) {
      mods.tempoScale = 1.25;
    }
  }

  return mods;
}

/**
 * Validates motion against design anti-slop guidelines.
 */
export function auditHallmarkSlopGates(animationSpecs) {
  const reports = [];

  // Gate 1: Repeated translation/opacity slop detection
  const translations = animationSpecs.filter(s => s.axis === 'translateY' || s.axis === 'translate');
  if (translations.length >= 3) {
    const firstVal = translations[0].initial_value;
    const allSame = translations.every(t => t.initial_value === firstVal);
    if (allSame) {
      reports.push({
        gate: 'Anti-Repetitive Layout Shift',
        severity: 'warning',
        message: `Repeated translateY(${firstVal}px) reveal detected across ${translations.length} elements. Vary initial offsets or stagger delays to avoid AI-slop appearance.`
      });
    }
  }

  // Gate 2: Element animation limits
  if (animationSpecs.length > 3) {
    reports.push({
      gate: 'Visual Coherence Limit',
      severity: 'info',
      message: `Page has ${animationSpecs.length} unique animation structures. Ensure timing parameters are aligned.`
    });
  }

  return reports;
}
