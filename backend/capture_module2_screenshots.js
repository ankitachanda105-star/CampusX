const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  // 1. Log in as Student
  console.log('Navigating to http://localhost:5173/login ...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Logged in as student, on page:', page.url());

  // Make sure we are on "Report a Problem" tab
  await page.waitForSelector('#tab-report-problem');
  await page.click('#tab-report-problem');

  // Fill in form to demonstrate realistic usage
  await page.type('#complaint-title', 'Projector flickering and distorted color in Block 38 Room 405');
  await page.select('#complaint-block', 'Block 38');
  await page.type('#complaint-room', 'Room 405');
  await page.type(
    '#complaint-description',
    'During afternoon lectures, the HDMI feed to the ceiling projector flickers intermittently with purple vertical bands. Needs cable replacement or projector hardware diagnosis.'
  );

  const submitFormPath = path.join(ARTIFACT_DIR, 'student_submit_form.png');
  await page.screenshot({ path: submitFormPath, fullPage: false });
  console.log('✓ Captured Student Submit Form at:', submitFormPath);

  // Submit the form
  await page.click('#complaint-submit-button');
  await page.waitForSelector('#complaint-success-card', { timeout: 8000 });
  console.log('Form submitted successfully!');

  // 2. Go to My Complaints tab & click on complaint CX1001 (which has full 3-step timeline)
  await page.click('#tab-my-complaints');
  await page.waitForSelector('.group', { timeout: 6000 });
  // Click first complaint item
  await page.click('.group');
  await page.waitForSelector('#complaint-detail-view', { timeout: 6000 });

  const timelineDetailPath = path.join(ARTIFACT_DIR, 'complaint_detail_timeline.png');
  await page.screenshot({ path: timelineDetailPath, fullPage: false });
  console.log('✓ Captured Complaint Detail with Status Timeline at:', timelineDetailPath);

  // 3. Log out and log in as Staff/Faculty (or Admin)
  await page.click('#logout-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Logged out, on page:', page.url());

  // Log in as Faculty to capture Staff Assigned Complaints view specifically
  await page.click('#logout-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Submit a complaint for CSE department via student first, or reassign
  // Let's log in as student and submit a CSE ticket
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  await page.click('#tab-report-problem');
  await page.type('#complaint-title', 'Compiler crashes and license server timeout in CSE Lab 304');
  await page.select('#complaint-block', 'Block 34');
  await page.type('#complaint-room', 'Lab 304');
  await page.type('#complaint-description', 'The GCC / Python development environment crashes when compiling lab exercises. Needs license server restart.');
  await page.click('#complaint-submit-button');
  await page.waitForSelector('#complaint-success-card', { timeout: 8000 });

  // Now log out from student
  await page.click('#logout-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Log in as Admin to reassign this ticket to School of Computer Science & Engineering so Dr. Vance has it
  await page.select('#role-select', 'Admin');
  await page.type('#email-input', 'ADM10822');
  await page.type('#password-input', 'Admin@123');
  await page.click('#login-submit-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Click reassign button on first row
  await page.waitForSelector('.divide-y tr button', { timeout: 6000 });
  await page.click('.divide-y tr button');
  await page.waitForSelector('select[class*="rounded-xl"]', { timeout: 4000 });
  // Select "School of Computer Science & Engineering"
  const selectElements = await page.$$('select');
  for (const s of selectElements) {
    const val = await page.evaluate(el => el.innerHTML, s);
    if (val.includes('School of Computer Science & Engineering')) {
      await s.select('School of Computer Science & Engineering');
      break;
    }
  }
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1000));

  // Now log in as Dr. Eleanor Vance (Faculty/Staff)
  await page.click('#logout-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  await page.select('#role-select', 'Faculty/Staff');
  await page.type('#email-input', 'EMP20491');
  await page.type('#password-input', 'Faculty@123');
  await page.click('#login-submit-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Logged in as Faculty, on page:', page.url());

  await page.waitForSelector('#tab-staff-assigned', { timeout: 6000 });
  await page.click('#tab-staff-assigned');
  await page.waitForSelector('.divide-y, .space-y-4', { timeout: 6000 });

  const staffAssignedPath = path.join(ARTIFACT_DIR, 'staff_assigned_complaints.png');
  await page.screenshot({ path: staffAssignedPath, fullPage: false });
  console.log('✓ Captured Staff Assigned Complaints View at:', staffAssignedPath);

  await browser.close();
  console.log('All Module 2 screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
