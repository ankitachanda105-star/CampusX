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

  // 1. Student Resource Catalogue & Booking Modal
  console.log('1. Capturing Resource Catalogue & Booking Modal...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-student-resources', { timeout: 10000 });
  await page.click('#tab-student-resources');

  await page.waitForSelector('button[id^="btn-book-resource-"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));

  // Click on the first "Reserve Facility" button
  const bookBtn = await page.$('button[id^="btn-book-resource-"]');
  await bookBtn.click();
  await page.waitForSelector('#resource-booking-modal', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1000));

  const resourceBookingPath = path.join(ARTIFACT_DIR, 'resource_booking_catalogue.png');
  await page.screenshot({ path: resourceBookingPath, fullPage: false });
  console.log('✓ Captured Resource Booking Catalogue at:', resourceBookingPath);

  // 2. Admin Predictive Maintenance Dashboard
  console.log('2. Capturing Predictive Maintenance Dashboard...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Admin');
  await page.type('#email-input', 'ADM10822');
  await page.type('#password-input', 'Admin@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-admin-maintenance', { timeout: 10000 });
  await page.click('#tab-admin-maintenance');

  await page.waitForSelector('#critical-maintenance-alert-banner', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));

  const maintenanceDashboardPath = path.join(ARTIFACT_DIR, 'predictive_maintenance_dashboard.png');
  await page.screenshot({ path: maintenanceDashboardPath, fullPage: false });
  console.log('✓ Captured Predictive Maintenance Dashboard at:', maintenanceDashboardPath);

  // 3. Admin Live Metrics Dashboard
  console.log('3. Capturing Admin Live Metrics Dashboard...');
  await page.waitForSelector('#tab-admin-analytics', { timeout: 10000 });
  await page.click('#tab-admin-analytics');

  await page.waitForSelector('#admin-live-metrics-dashboard', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1500));

  const liveMetricsPath = path.join(ARTIFACT_DIR, 'admin_live_metrics.png');
  await page.screenshot({ path: liveMetricsPath, fullPage: false });
  console.log('✓ Captured Admin Live Metrics at:', liveMetricsPath);

  await browser.close();
  console.log('All 3 Phase 3 screenshots successfully generated!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
