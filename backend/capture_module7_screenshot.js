const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1050'],
    defaultViewport: { width: 1400, height: 1050 },
  });

  const page = await browser.newPage();

  // 1. Log in as Super Admin to demonstrate all metrics, Recharts, AI placeholder, and Governance
  console.log('1. Logging in as Super Admin...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Super Admin');
  await page.type('#email-input', 'DIR001');
  await page.type('#password-input', 'SuperAdmin@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#campusx-admin-dashboard-root', { timeout: 10000 });
  await page.waitForSelector('#dashboard-recharts-grid', { timeout: 10000 });
  await page.waitForSelector('#ai-insights-placeholder-panel', { timeout: 10000 });
  await page.waitForSelector('#super-admin-governance-card', { timeout: 10000 });

  // Apply "Last 7 Days" filter to verify filter responsiveness
  await page.waitForSelector('#filter-range-7d', { timeout: 5000 });
  await page.click('#filter-range-7d');
  await new Promise((r) => setTimeout(r, 1000));

  // Switch back to "Last 30 Days" for complete telemetry overview
  await page.click('#filter-range-30d');
  await new Promise((r) => setTimeout(r, 1500));

  const fullDashboardPath = path.join(ARTIFACT_DIR, 'admin_dashboard_full.png');
  await page.screenshot({ path: fullDashboardPath, fullPage: true });
  console.log('✓ Captured Full Admin Dashboard with applied filters at:', fullDashboardPath);

  await browser.close();
  console.log('Module 7 screenshot successfully captured!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
