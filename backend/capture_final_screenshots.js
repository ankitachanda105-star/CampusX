const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching browser for final Module 2 screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950'],
    defaultViewport: { width: 1280, height: 950 },
  });

  const page = await browser.newPage();

  // 1. Log in as Student
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#role-select');
  await page.select('#role-select', 'Student');
  await page.type('#email-input', '12345678');
  await page.type('#password-input', 'Student@123');
  await page.click('#login-submit-button');

  await page.waitForSelector('#tab-report-problem', { timeout: 8000 });

  // Submit CSE complaint so Dr. Eleanor Vance has an active ticket
  await page.type('#complaint-title', 'Compiler crashes and license server timeout in CSE Lab 304');
  await page.select('#complaint-block', 'Block 34');
  await page.type('#complaint-room', 'Lab 304');
  await page.type(
    '#complaint-description',
    'The GCC / Python development environment crashes when compiling lab exercises. Needs CSE department license server restart.'
  );
  await page.click('#complaint-submit-button');
  await page.waitForSelector('#complaint-success-card', { timeout: 8000 });
  console.log('Submitted CSE ticket!');

  // Now go to My Complaints tab
  await page.click('#tab-my-complaints');
  await page.waitForSelector('.space-y-3 > div', { timeout: 6000 });

  // Let's accept and resolve one ticket via API in background so the timeline has full 3 steps
  // Fetch tickets for student
  const studentToken = await page.evaluate(() => localStorage.getItem('campusx_token'));
  
  // Update the first ticket to In Progress then Resolved
  const myRes = await fetch('http://localhost:5000/api/complaints/my', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const myData = await myRes.json();
  const ticketToResolve = myData.complaints[0];

  if (ticketToResolve) {
    // Admin login to update ticket status
    const adminRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ADM10822', password: 'Admin@123', role: 'Admin' })
    });
    const adminData = await adminRes.json();

    await fetch(`http://localhost:5000/api/complaints/${ticketToResolve.complaintId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminData.token}` },
      body: JSON.stringify({ status: 'In Progress', note: 'Staff dispatched to inspect equipment in Block 34.' })
    });

    await fetch(`http://localhost:5000/api/complaints/${ticketToResolve.complaintId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminData.token}` },
      body: JSON.stringify({ status: 'Resolved', note: 'License server restarted and compilers tested successfully.' })
    });
  }

  // Refresh and open the resolved ticket
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#tab-my-complaints');
  await page.click('#tab-my-complaints');
  await page.waitForSelector('.space-y-3 > div', { timeout: 6000 });
  await page.click('.space-y-3 > div:first-child');
  await page.waitForSelector('#complaint-detail-view', { timeout: 6000 });
  await new Promise(r => setTimeout(r, 1000));

  const timelinePath = path.join(ARTIFACT_DIR, 'complaint_detail_timeline.png');
  await page.screenshot({ path: timelinePath, fullPage: false });
  console.log('✓ Captured Complaint Detail with Full 3-Step Status Timeline at:', timelinePath);

  // 2. Log out and log in as Dr. Eleanor Vance (Faculty/Staff)
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
  console.log('✓ Captured Staff Assigned Complaints View at:', staffPath);

  await browser.close();
  console.log('Final screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error in capture script:', err);
  process.exit(1);
});
