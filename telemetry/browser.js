import puppeteer from 'puppeteer';

/// Ephemerally launches a headless Puppeteer browser instance.
export async function spawnBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
}
