const fs = require('node:fs');

function chromiumExecutable() {
  const candidates = [
    process.env.BROWSER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const executable = candidates.find(candidate => fs.existsSync(candidate));
  if (!executable) throw new Error('Chromium is required; set BROWSER_EXECUTABLE_PATH');
  return executable;
}

async function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const error = new Error('Playwright is required for browser acceptance; install it before running the mandatory browser gate');
    error.code = 'PLAYWRIGHT_REQUIRED';
    throw error;
  }
}

async function withChromium(fn, options = {}) {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({
    executablePath: chromiumExecutable(),
    headless: options.headless !== false,
  });
  const context = await browser.newContext(options.context || {});
  const page = await context.newPage();
  try {
    return await fn({ browser, context, page });
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = { chromiumExecutable, loadPlaywright, withChromium };
