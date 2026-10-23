const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1050'],
    defaultViewport: { width: 1440, height: 1050 },
  });

  const page = await browser.newPage();

  // ==========================================
  // PART 1: STUDENT AI ASSISTANT CHAT
  // ==========================================
  console.log('1. Logging in as Student Alex Kumar (12345678)...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  // Wait for student dashboard to load
  console.log('2. Waiting for Student Dashboard & AI Trigger Button...');
  await page.waitForSelector('#campusx-assistant-trigger-btn', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Click floating assistant button to open chat drawer
  console.log('3. Opening CampusX AI Assistant floating drawer...');
  await page.click('#campusx-assistant-trigger-btn');
  await page.waitForSelector('#campusx-assistant-modal', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 600));

  // Click Expand Button for optimal screenshot view
  const expandBtn = await page.$('button[title="Expand Size"]');
  if (expandBtn) {
    await expandBtn.click();
    await new Promise((r) => setTimeout(r, 600));
  }

  // Query 1: Where is my bonafide application?
  console.log('4. Querying: "Where is my bonafide application?"...');
  const inputSelector = '#campusx-assistant-modal input[type="text"]';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, 'Where is my bonafide application?');
  await page.keyboard.press('Enter');

  // Wait for answer to arrive
  await new Promise((r) => setTimeout(r, 2200));

  // Query 2: Report a broken fan in Room 215
  console.log('5. Querying: "Report a broken fan in Room 215"...');
  await page.type(inputSelector, 'Report a broken fan in Room 215');
  await page.keyboard.press('Enter');

  // Wait for answer with action card to arrive
  await new Promise((r) => setTimeout(r, 2200));

  // Capture student screenshot
  const studentScreenshotPath = path.join(ARTIFACT_DIR, 'student_ai_assistant_chat.png');
  await page.screenshot({ path: studentScreenshotPath, fullPage: false });
  console.log('✓ Captured student AI assistant chat artifact at:', studentScreenshotPath);

  // ==========================================
  // PART 2: ADMIN AI OPERATIONS CONSOLE
  // ==========================================
  console.log('6. Logging in as Admin Marcus Ward (ADM10822)...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Admin');
  await page.type('#email-input', 'ADM10822');
  await page.type('#password-input', 'Admin@123');
  await page.click('#login-submit-button');

  // Wait for admin dashboard
  console.log('7. Waiting for Admin Dashboard...');
  await page.waitForSelector('#tab-admin-assistant', { timeout: 12000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Switch to AI Operations Assistant tab
  console.log('8. Opening Admin AI Operations Assistant Console...');
  await page.click('#tab-admin-assistant');
  await page.waitForSelector('#admin-assistant-console-root', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Click 1-Click Query: Department Complaints
  console.log('9. Executing 1-Click RAG: Department Complaints...');
  await page.click('#admin-quick-query-0');
  await new Promise((r) => setTimeout(r, 2800));

  // Click 1-Click Query: Equipment Failure Risk
  console.log('10. Executing 1-Click RAG: Equipment Failure Risk...');
  await page.click('#admin-quick-query-2');
  await new Promise((r) => setTimeout(r, 2800));

  // Capture admin screenshot
  const adminScreenshotPath = path.join(ARTIFACT_DIR, 'admin_ai_assistant_chat.png');
  await page.screenshot({ path: adminScreenshotPath, fullPage: false });
  console.log('✓ Captured admin AI operations chat artifact at:', adminScreenshotPath);

  await browser.close();
  console.log('All Module 8 screenshot artifacts successfully generated!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
