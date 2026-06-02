import { TriggerType } from '../types.js';

/// Runs interaction triggers and logs 1.5 seconds of frame computed styles.
export async function captureTelemetry(page, selector, trigger) {
  // Setup trigger action inside browser evaluation context
  let triggerJs = '';
  switch (trigger) {
    case TriggerType.HOVER:
      triggerJs = `
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.classList.add('hover', 'is-hovered');
      `;
      break;
    case TriggerType.SCROLL:
    case TriggerType.SCROLL_SCRUB:
      triggerJs = `
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.scrollTo({ top: window.scrollY + 150, behavior: 'smooth' });
      `;
      break;
    case TriggerType.CLICK:
      triggerJs = `
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      `;
      break;
    default:
      triggerJs = '';
  }

  // Inject script and return telemetry frames
  const frames = await page.evaluate((sel, triggerAction) => {
    return new Promise((resolve) => {
      const el = document.querySelector(sel);
      if (!el) {
        resolve([]);
        return;
      }

      const frames = [];
      let startTime = null;

      function capture(timestamp) {
        if (!startTime) startTime = timestamp;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        frames.push({
          t: timestamp - startTime,
          transform: style.transform || 'none',
          opacity: parseFloat(style.opacity || '1'),
          boxShadow: style.boxShadow || '',
          filter: style.filter || '',
          rect: {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          }
        });

        if (timestamp - startTime < 1500) {
          requestAnimationFrame(capture);
        } else {
          resolve(frames);
        }
      }

      // Execute trigger action
      if (triggerAction) {
        try {
          eval(triggerAction);
        } catch (e) {
          // ignore action execution errors
        }
      }

      requestAnimationFrame(capture);
    });
  }, selector, triggerJs);

  return frames;
}
