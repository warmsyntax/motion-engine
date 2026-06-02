import { spawnBrowser } from './browser.js';
import { detectTrigger } from './trigger_detector.js';
import { captureTelemetry } from './injector.js';

/// Connects to a reference website and captures exact computed frame styling over 1.5 seconds.
export async function runTelemetry(url, selector) {
  let browser = null;
  try {
    browser = await spawnBrowser();
    const page = await browser.newPage();
    
    // Set typical viewport & bypass standard bot blockers
    await page.setViewport({ width: 1280, height: 800 });
    
    console.error(`[motion-engine] Navigation to URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Wait for dynamic scripting assets
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Detect trigger type
    const trigger = await detectTrigger(page, selector);
    console.error(`[motion-engine] Classified trigger type: ${trigger}`);

    // Capture telemetry frames
    const frames = await captureTelemetry(page, selector, trigger);
    console.error(`[motion-engine] Successfully captured ${frames.length} frames.`);

    return { frames, trigger };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
