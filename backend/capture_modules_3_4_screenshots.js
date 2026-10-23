const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950'],
    defaultViewport: { width: 1280, height: 950 },
  });

  const page = await browser.newPage();

  // -------------------------------------------------------------
  // 1. Log in as Student -> Smart Queue Token Card
  // -------------------------------------------------------------
  console.log('1. Student Queue Card Capture...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-student-queue', { timeout: 8000 });
  await page.click('#tab-student-queue');
  await page.waitForSelector('#live-token-status-card', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 800));

  const studentQueuePath = path.join(ARTIFACT_DIR, 'student_queue_token.png');
  await page.screenshot({ path: studentQueuePath, fullPage: false });
  console.log('✓ Captured Student Queue Token Card at:', studentQueuePath);

  // -------------------------------------------------------------
  // 2. Log in as Admin -> Queue Operations Console
  // -------------------------------------------------------------
  console.log('2. Admin Queue Console Capture...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Admin');
  await page.type('#email-input', 'ADM10822');
  await page.type('#password-input', 'Admin@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-admin-queue', { timeout: 8000 });
  await page.click('#tab-admin-queue');
  await page.waitForSelector('#btn-call-next', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 800));

  const adminConsolePath = path.join(ARTIFACT_DIR, 'admin_queue_console.png');
  await page.screenshot({ path: adminConsolePath, fullPage: false });
  console.log('✓ Captured Admin Queue Console at:', adminConsolePath);

  // -------------------------------------------------------------
  // 3. Log back in as Student -> Service Request Tracker Stepper
  // -------------------------------------------------------------
  console.log('3. Service Request Stepper Capture...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-student-services', { timeout: 8000 });
  await page.click('#tab-student-services');

  await page.waitForSelector('#subtab-service-tracker', { timeout: 8000 });
  await page.click('#subtab-service-tracker');

  // Click CX5001 (Bonafide Certificate) to show in-progress stage with ticked, active, and greyed steps
  await page.waitForSelector('#request-item-cx5001', { timeout: 8000 });
  await page.click('#request-item-cx5001');

  await page.waitForSelector('#service-vertical-stepper', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1000));

  const stepperPath = path.join(ARTIFACT_DIR, 'service_request_stepper.png');
  await page.screenshot({ path: stepperPath, fullPage: false });
  console.log('✓ Captured Service Request Tracker Stepper at:', stepperPath);

  await browser.close();
  console.log('All 3 screenshots successfully generated!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
