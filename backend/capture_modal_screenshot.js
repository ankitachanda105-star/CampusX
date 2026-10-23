const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function captureModal() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,950'],
    defaultViewport: { width: 1366, height: 950 },
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Admin');
  await page.type('#email-input', 'ADM10822');
  await page.type('#password-input', 'Admin@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-admin-maintenance', { timeout: 10000 });
  await page.click('#tab-admin-maintenance');

  await page.waitForSelector('button[id^="btn-view-equipment-"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));

  // Click Inspect on the first high risk equipment
  const inspectBtn = await page.$('button[id^="btn-view-equipment-"]');
  await inspectBtn.click();

  await page.waitForSelector('#equipment-detail-modal', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1000));

  const modalPath = path.join(ARTIFACT_DIR, 'equipment_recharts_detail.png');
  await page.screenshot({ path: modalPath, fullPage: false });
  console.log('✓ Captured Equipment Recharts Detail Modal at:', modalPath);

  await browser.close();
}

captureModal().catch(console.error);
