const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1100'],
    defaultViewport: { width: 1280, height: 1100 },
  });

  const page = await browser.newPage();

  // 1. Capture Student Submit Form
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-report-problem', { timeout: 8000 });
  await page.type('#complaint-title', 'Projector flickering and distorted color in Block 38 Room 405');
  await page.select('#complaint-block', 'Block 38');
  await page.type('#complaint-room', 'Room 405');
  await page.type(
    '#complaint-description',
    'During afternoon lectures, the HDMI feed to the ceiling projector flickers intermittently with purple vertical bands. Needs cable replacement or projector hardware diagnosis.'
  );

  const submitFormPath = path.join(ARTIFACT_DIR, 'student_submit_form.png');
  await page.screenshot({ path: submitFormPath, fullPage: false });
  console.log('✓ Captured student_submit_form.png');

  // Submit and create CSE complaint for Faculty
  await page.click('#complaint-submit-button');
  await page.waitForSelector('#complaint-success-card', { timeout: 8000 });

  // 2. Capture Complaint Detail with 3-Step Timeline
  await page.click('#tab-my-complaints');
  await page.waitForSelector('.space-y-3 > div', { timeout: 6000 });
  // Click on CX1001 (the resolved one with 3 steps)
  const complaintCards = await page.$$('.space-y-3 > div');
  for (const card of complaintCards) {
    const text = await page.evaluate(el => el.textContent, card);
    if (text.includes('CX1001')) {
      await card.click();
      break;
    }
  }

  await page.waitForSelector('#complaint-detail-view', { timeout: 6000 });
  await new Promise(r => setTimeout(r, 1200));

  const detailTimelinePath = path.join(ARTIFACT_DIR, 'complaint_detail_timeline.png');
  await page.screenshot({ path: detailTimelinePath, fullPage: false });
  console.log('✓ Captured complaint_detail_timeline.png');

  // Also submit a complaint for CSE department
  await page.click('#tab-report-problem');
  await page.type('#complaint-title', 'Compiler crashes and license server timeout in CSE Lab 304');
  await page.select('#complaint-block', 'Block 34');
  await page.type('#complaint-room', 'Lab 304');
  await page.type(
    '#complaint-description',
    'The GCC / Python development environment crashes when compiling lab exercises. Needs CSE department license server restart.'
  );
  await page.click('#complaint-submit-button');
  await page.waitForSelector('#complaint-success-card', { timeout: 8000 });

  // 3. Capture Staff Assigned Complaints View
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Faculty/Staff');
  await page.type('#email-input', 'EMP20491');
  await page.type('#password-input', 'Faculty@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-staff-assigned', { timeout: 8000 });
  await page.click('#tab-staff-assigned');
  await page.waitForSelector('.space-y-4 > div', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1000));

  const staffPath = path.join(ARTIFACT_DIR, 'staff_assigned_complaints.png');
  await page.screenshot({ path: staffPath, fullPage: false });
  console.log('✓ Captured staff_assigned_complaints.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
