import { TriggerType } from '../types.js';

/// Detects the animation trigger type in use by inspecting page scripts, stylesheets, and tags.
export async function detectTrigger(page, selector) {
  const triggerStr = await page.evaluate((sel) => {
    try {
      const el = document.querySelector(sel);
      if (!el) return 'time';

      // 1. Check for active GSAP ScrollTrigger global indicators
      if (window.ScrollTrigger || (window.gsap && window.gsap.registerPlugin)) {
        return 'scroll_scrub';
      }

      // 2. Check for modern CSS Scroll-driven animations
      const style = window.getComputedStyle(el);
      if (style.animationTimeline && style.animationTimeline !== 'none') {
        return 'scroll_scrub';
      }

      // 3. Hover heuristics (classes, buttons, anchor elements)
      const lSel = sel.toLowerCase();
      if (
        lSel.includes('btn') ||
        lSel.includes('button') ||
        lSel.includes('card') ||
        lSel.includes('link') ||
        lSel.includes('hover') ||
        el.tagName === 'BUTTON' ||
        el.tagName === 'A'
      ) {
        return 'hover';
      }

      // 4. Scroll Reveal heuristics (fading in, heroes, sections)
      if (
        lSel.includes('reveal') ||
        lSel.includes('hero') ||
        lSel.includes('section') ||
        lSel.includes('fade') ||
        lSel.includes('animate-on-scroll')
      ) {
        return 'scroll';
      }

      return 'time';
    } catch (e) {
      return 'time';
    }
  }, selector);

  switch (triggerStr) {
    case 'scroll':
      return TriggerType.SCROLL;
    case 'scroll_scrub':
      return TriggerType.SCROLL_SCRUB;
    case 'hover':
      return TriggerType.HOVER;
    case 'click':
      return TriggerType.CLICK;
    default:
      return TriggerType.TIME;
  }
}
