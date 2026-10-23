const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,950'],
    defaultViewport: { width: 1366, height: 950 },
  });

  const page = await browser.newPage();

  // -------------------------------------------------------------
  // 1. Student Resource Availability View
  // -------------------------------------------------------------
  console.log('1. Capturing Student Resource Availability View...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-student-resources', { timeout: 10000 });
  await page.click('#tab-student-resources');

  await page.waitForSelector('#student-resource-availability-container', { timeout: 10000 });
  await page.waitForSelector('#resource-cards-grid', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  const studentResPath = path.join(ARTIFACT_DIR, 'student_resource_availability.png');
  await page.screenshot({ path: studentResPath, fullPage: false });
  console.log('✓ Captured Student Resource Availability at:', studentResPath);

  // -------------------------------------------------------------
  // 2. Admin Resource Management with Utilization Bar & %
  // -------------------------------------------------------------
  console.log('2. Capturing Admin Resource Utilization Ledger...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Admin');
  await page.type('#email-input', 'ADM10822');
  await page.type('#password-input', 'Admin@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-admin-facilities', { timeout: 10000 });
  await page.click('#tab-admin-facilities');

  await page.waitForSelector('#admin-resource-table-card', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));

  const adminUtilPath = path.join(ARTIFACT_DIR, 'admin_resource_utilization.png');
  await page.screenshot({ path: adminUtilPath, fullPage: false });
  console.log('✓ Captured Admin Resource Utilization at:', adminUtilPath);

  // -------------------------------------------------------------
  // 3. Admin Predictive Maintenance Risk Table
  // -------------------------------------------------------------
  console.log('3. Capturing Admin Maintenance Risk Table...');
  await page.waitForSelector('#tab-admin-maintenance', { timeout: 10000 });
  await page.click('#tab-admin-maintenance');

  await page.waitForSelector('#table-maintenance-risk', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1500));

  const adminMaintPath = path.join(ARTIFACT_DIR, 'admin_maintenance_risk.png');
  await page.screenshot({ path: adminMaintPath, fullPage: false });
  console.log('✓ Captured Admin Maintenance Risk Table at:', adminMaintPath);

  await browser.close();
  console.log('All 3 required screenshot artifacts successfully captured!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
