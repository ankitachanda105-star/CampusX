const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850'],
    defaultViewport: { width: 1280, height: 850 },
  });

  const page = await browser.newPage();

  // 1. Capture Login Page
  console.log('Navigating to http://localhost:5173/login ...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  const loginPath = path.join(ARTIFACT_DIR, 'login_page.png');
  await page.screenshot({ path: loginPath, fullPage: false });
  console.log('✓ Captured LPU Login Page at:', loginPath);

  // 2. Perform Login as Student using Reg No: 12345678
  console.log('Filling login form with LPU student registration credentials...');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  // Wait for redirect to /student/dashboard
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Current URL after login:', page.url());

  // Click "Test Authorized Route" so the live RBAC verification box renders
  try {
    await page.waitForSelector('#test-student-endpoint-btn', { timeout: 3000 });
    await page.click('#test-student-endpoint-btn');
    await page.waitForSelector('#rbac-test-output', { timeout: 3000 });
  } catch (e) {
    console.log('Endpoint test trigger completed or skipped:', e.message);
  }

  const studentDashboardPath = path.join(ARTIFACT_DIR, 'student_dashboard.png');
  await page.screenshot({ path: studentDashboardPath, fullPage: false });
  console.log('✓ Captured LPU Student Dashboard at:', studentDashboardPath);

  // 3. Attempt Access to Restricted Admin Route (/admin/dashboard)
  console.log('Attempting navigation to restricted /admin/dashboard as Student...');
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle0' });
  console.log('Current URL after restricted attempt:', page.url());

  // Verify unauthorized card rendered
  await page.waitForSelector('#unauthorized-card', { timeout: 5000 });
  const blockedAccessPath = path.join(ARTIFACT_DIR, 'blocked_access.png');
  await page.screenshot({ path: blockedAccessPath, fullPage: false });
  console.log('✓ Captured Blocked Access (403) at:', blockedAccessPath);

  await browser.close();
  console.log('All LPU screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
