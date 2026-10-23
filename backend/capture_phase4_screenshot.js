const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1100'],
    defaultViewport: { width: 1400, height: 1100 },
  });

  const page = await browser.newPage();

  // 1. Log in as Student
  console.log('1. Logging in as Student Alex Kumar (12345678)...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  // 2. Navigate to Report Problem
  console.log('2. Navigating to Report Problem...');
  await page.waitForSelector('#complaint-title', { timeout: 10000 });

  // 3. Fill in live complaint details
  console.log('3. Filling in complaint form with realistic LPU problem...');
  await page.type('#complaint-title', 'AC not cooling and emitting sparks in 32-401');
  await page.select('#complaint-block', 'Block 32');
  await page.type('#complaint-room', 'Room 401');
  await page.type(
    '#complaint-description',
    'Air conditioner blower runs but no cooling. Wall switchboard emits burning smell and visible sparks during lecture in Block 32 Room 401.'
  );

  // 4. Submit Complaint
  console.log('4. Submitting complaint to trigger real Python ML classification...');
  await page.click('#complaint-submit-button');

  // 5. Wait for success card with AI auto-classification badges
  console.log('5. Waiting for AI classification confirmation card...');
  await page.waitForSelector('#complaint-success-card', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));

  // 6. Capture full screenshot showing the live AI-classified ticket
  const screenshotPath = path.join(ARTIFACT_DIR, 'live_ai_complaint_classified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('✓ Captured live AI complaint classification artifact at:', screenshotPath);

  await browser.close();
  console.log('Screenshot capture complete!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
