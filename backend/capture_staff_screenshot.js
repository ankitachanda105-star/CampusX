const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function captureStaffView() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  // Go directly to login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');

  // Submit a complaint for Dr. Eleanor Vance's department (School of Computer Science & Engineering) first
  // Log in as student
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-report-problem', { timeout: 8000 });
  await page.click('#tab-report-problem');

  await page.type('#complaint-title', 'GPU Server CUDA toolkit corrupted in CSE Research Lab');
  await page.select('#complaint-block', 'Block 34');
  await page.type('#complaint-room', 'Lab 304');
  await page.type('#complaint-description', 'The shared GPU server in Block 34 research lab has missing CUDA dynamic libraries. Students cannot run deep learning workloads.');
  await page.click('#complaint-submit-button');
  await page.waitForSelector('#complaint-success-card', { timeout: 8000 });
  console.log('Student submitted GPU complaint!');

  // Now log in as Dr. Eleanor Vance (Faculty/Staff)
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Faculty/Staff');
  await page.type('#email-input', 'EMP20491');
  await page.type('#password-input', 'Faculty@123');
  await page.click('#login-submit-button');

  // Wait for Faculty Dashboard
  await page.waitForSelector('#tab-staff-assigned', { timeout: 8000 });
  await page.click('#tab-staff-assigned');
  await new Promise(r => setTimeout(r, 1500));

  const staffAssignedPath = path.join(ARTIFACT_DIR, 'staff_assigned_complaints.png');
  await page.screenshot({ path: staffAssignedPath, fullPage: false });
  console.log('✓ Captured Staff Assigned Complaints View at:', staffAssignedPath);

  await browser.close();
  console.log('Staff assigned view captured successfully!');
}

captureStaffView().catch(err => {
  console.error('Error in captureStaffView:', err);
  process.exit(1);
});
