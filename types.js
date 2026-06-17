// ─── Domain Types & Heuristics ───────────────────────────────────────

export const TypographyClass = {
  SERIF: 'serif',
  SANS_SERIF: 'sans_serif',
  DISPLAY: 'display',
  UNKNOWN: 'unknown'
};

export const TriggerType = {
  SCROLL: 'scroll',
  SCROLL_SCRUB: 'scroll_scrub',
  HOVER: 'hover',
  TIME: 'time',
  CLICK: 'click',
  FOCUS: 'focus',
  DRAG: 'drag',
  PRESS: 'press'
};

export const KineticWeight = {
  HEAVY: 'heavy',
  GROUNDED: 'grounded',
  BALANCED: 'balanced',
  LIGHT: 'light',
  FLOATING: 'floating'
};

export const SpringAxis = {
  TranslateX: 'translateX',
  TranslateY: 'translateY',
  TranslateZ: 'translateZ',
  Opacity: 'opacity',
  Scale: 'scale',
  ScaleX: 'scaleX',
  ScaleY: 'scaleY',
  Rotate: 'rotate',
  RotateX: 'rotateX',
  RotateY: 'rotateY',
  RotateZ: 'rotateZ'
};

export const SpatialPlane = {
  FLAT: 'flat',
  DEPTH: 'depth'
};

export class SpatialEnvironment {
  constructor({
    perspective_px = null,
    perspective_origin = 'center',
    transform_style = 'flat',
    overflow = 'visible'
  } = {}) {
    this.perspective_px = perspective_px;
    this.perspective_origin = perspective_origin;
    this.transform_style = transform_style;
    this.overflow = overflow;
  }
}

export class UserIntent {
  constructor({
    kinetic_weight = KineticWeight.BALANCED,
    trigger = TriggerType.SCROLL,
    spatial_plane = SpatialPlane.FLAT
  } = {}) {
    this.kinetic_weight = kinetic_weight;
    this.trigger = trigger;
    this.spatial_plane = spatial_plane;
  }
}



export class ThemeProfile {
  constructor({
    typography_class = TypographyClass.SANS_SERIF,
    font_weight = 400,
    tempo_scale = 1.0,
    color_tokens = [],
    stiffness_override_cap = null,
    damping_override_min = null
  } = {}) {
    this.typography_class = typography_class;
    this.font_weight = font_weight;
    this.tempo_scale = tempo_scale;
    this.color_tokens = color_tokens; // Array of { name, value }
    this.stiffness_override_cap = stiffness_override_cap;
    this.damping_override_min = damping_override_min;
  }

  /// Font weight → mass multiplier per motion.txt Part 4.4
  getMassMultiplier() {
    const w = this.font_weight;
    if (w <= 300) return 0.7;
    if (w <= 499) return 1.0;
    if (w <= 799) return 1.3;
    return 1.6;
  }

  /// Typography class → max stiffness constraint
  getMaxStiffness() {
    if (this.stiffness_override_cap !== null) {
      return this.stiffness_override_cap;
    }
    switch (this.typography_class) {
      case TypographyClass.SERIF:
      case TypographyClass.DISPLAY:
        return 200.0;
      case TypographyClass.SANS_SERIF:
        return 800.0;
      default:
        return 500.0;
    }
  }

  /// Typography class → min damping constraint
  getMinDamping() {
    if (this.damping_override_min !== null) {
      return this.damping_override_min;
    }
    switch (this.typography_class) {
      case TypographyClass.SERIF:
      case TypographyClass.DISPLAY:
        return 25.0;
      case TypographyClass.SANS_SERIF:
        return 5.0;
      default:
        return 15.0;
    }
  }
}

export class SpringParams {
  constructor({
    axis,
    stiffness,
    damping,
    mass,
    damping_ratio = 1.0,
    perceptual_duration_ms = 300,
    initial_value = 0.0,
    target_value = 0.0
  }) {
    this.axis = axis;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.damping_ratio = damping_ratio;
    this.perceptual_duration_ms = perceptual_duration_ms;
    this.initial_value = initial_value;
    this.target_value = target_value;
  }

  /// Compute damping ratio: ζ = c / (2 * sqrt(k * m))
  static computeDampingRatio(stiffness, damping, mass) {
    const critical = 2.0 * Math.sqrt(stiffness * mass);
    return critical === 0.0 ? 1.0 : damping / critical;
  }
}

export class MotionSpec {
  constructor({
    target_selector,
    source = 'solver',
    spatial_env = {
      perspective_px: null,
      perspective_origin: 'center',
      transform_style: 'flat',
      overflow: 'visible'
    },
    physics_blocks = [],
    thematic_rules = [],
    trigger_type = TriggerType.SCROLL,
    implementation_library = 'framer-motion',
    scroll_method = 'IntersectionObserver'
  }) {
    this.target_selector = target_selector;
    this.source = source;
    this.spatial_env = spatial_env;
    this.physics_blocks = physics_blocks;
    this.thematic_rules = thematic_rules;
    this.trigger_type = trigger_type;
    this.implementation_library = implementation_library;
    this.scroll_method = scroll_method;
  }
}
