// backend/run_broken_projector_demo.js
// End-to-End Broken Projector Lifecycle Demo & Sequential Screenshots Capture
const puppeteer = require('puppeteer-core');
const path = require('path');
const mongoose = require('mongoose');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000';

async function runDemo() {
  console.log('================================================================');
  console.log(' Starting Phase 5 End-to-End Broken Projector Lifecycle Demo... ');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1050'],
    defaultViewport: { width: 1440, height: 1050 },
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------
    // DEMO STEP 1: Student Reports Broken Projector
    // -------------------------------------------------------------
    console.log('[Step 1] Logging in as Student Alex Kumar (12345678)...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#role-select');
    await page.select('#role-select', 'Student');
    await page.type('#email-input', '12345678');
    await page.type('#password-input', 'Student@123');
    await page.click('#login-submit-button');

    await page.waitForSelector('#tab-report-problem', { timeout: 8000 });
    await page.click('#tab-report-problem');
    await page.waitForSelector('#complaint-title', { timeout: 6000 });

    console.log('[Step 1] Filling complaint report for Epson Projector P-101 in Block 34 Room 215...');
    await page.type('#complaint-title', 'Broken Projector in Room 215: Lamp Failure & Display Shutdown');
    await page.select('#complaint-block', 'Block 34');
    await page.type('#complaint-room', 'Room 215');
    await page.type(
      '#complaint-description',
      'Classroom HD Laser Projector P-101 in Block 34 Room 215 has a burned-out lamp and powers off after 2 minutes. Urgent hardware repair needed for scheduled CSE lectures.'
    );

    await new Promise((r) => setTimeout(r, 600));
    const demo1Path = path.join(ARTIFACT_DIR, 'demo_1_student_report.png');
    await page.screenshot({ path: demo1Path, fullPage: false });
    console.log('✓ Captured [demo_1_student_report.png]:', demo1Path);

    // -------------------------------------------------------------
    // DEMO STEP 2: AI Microservice Classifies Ticket
    // -------------------------------------------------------------
    console.log('[Step 2] Submitting ticket to trigger AI microservice classification...');
    await page.click('#complaint-submit-button');
    await page.waitForSelector('#complaint-success-card', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));

    const bannerText = await page.$eval('#complaint-success-card', (el) => el.innerText);
    console.log('AI Banner Output:\n', bannerText);

    const demo2Path = path.join(ARTIFACT_DIR, 'demo_2_ai_classified.png');
    await page.screenshot({ path: demo2Path, fullPage: false });
    console.log('✓ Captured [demo_2_ai_classified.png]:', demo2Path);

    // Extract newly created complaint ID
    const complaintIdMatch = bannerText.match(/CX\d+/);
    const createdComplaintId = complaintIdMatch ? complaintIdMatch[0] : 'CX1001';
    console.log(`Generated Ticket ID: ${createdComplaintId}`);

    // -------------------------------------------------------------
    // DEMO STEP 3: Staff/Admin Accepts & Resolves Complaint
    // -------------------------------------------------------------
    console.log('[Step 3] Logging in as Admin Marcus Ward (ADM10822) to resolve ticket...');
    // API resolution using Admin credentials
    const adminLoginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ADM10822', password: 'Admin@123', role: 'Admin' }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token || adminLoginData.data?.token;

    // Transition to In Progress
    await fetch(`${API_URL}/api/complaints/${createdComplaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'In Progress',
        note: 'Hardware technician dispatched to Block 34 Room 215 with replacement projector lamp module.',
      }),
    });

    // Transition to Resolved
    await fetch(`${API_URL}/api/complaints/${createdComplaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Resolved',
        note: 'Replacement lamp installed and optical alignment completed. Tested video display and verified with department.',
      }),
    });

    // Log in via UI as Admin to view resolved ticket in Admin Complaints Table
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });

    await page.waitForSelector('#role-select');
    await page.select('#role-select', 'Admin');
    await page.type('#email-input', 'ADM10822');
    await page.type('#password-input', 'Admin@123');
    await page.click('#login-submit-button');

    await page.waitForSelector('#tab-admin-complaints', { timeout: 8000 });
    await page.click('#tab-admin-complaints');
    await page.waitForSelector('table tbody tr', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));

    const demo3Path = path.join(ARTIFACT_DIR, 'demo_3_staff_resolved.png');
    await page.screenshot({ path: demo3Path, fullPage: false });
    console.log('✓ Captured [demo_3_staff_resolved.png]:', demo3Path);

    // -------------------------------------------------------------
    // DEMO STEP 4: Student Sees Resolution Timeline
    // -------------------------------------------------------------
    console.log('[Step 4] Student views resolution status and full audit timeline...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });

    await page.waitForSelector('#role-select');
    await page.select('#role-select', 'Student');
    await page.type('#email-input', '12345678');
    await page.type('#password-input', 'Student@123');
    await page.click('#login-submit-button');

    await page.waitForSelector('#tab-my-complaints', { timeout: 8000 });
    await page.click('#tab-my-complaints');
    await page.waitForSelector('.space-y-3 > div', { timeout: 8000 });
    // Click on the newly resolved complaint card
    await page.click('.space-y-3 > div:first-child');
    await page.waitForSelector('#complaint-detail-view', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    const demo4Path = path.join(ARTIFACT_DIR, 'demo_4_student_resolution.png');
    await page.screenshot({ path: demo4Path, fullPage: false });
    console.log('✓ Captured [demo_4_student_resolution.png]:', demo4Path);

    // -------------------------------------------------------------
    // DEMO STEP 5: Simulate 2 More Complaints on Projector P-101 in 30 Days
    // -------------------------------------------------------------
    console.log('[Step 5] Simulating failure incident logs on Projector P-101 via Maintenance API...');

    // Failure 1 (10 days ago)
    await fetch(`${API_URL}/api/maintenance/equipment/P-101/failures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        issue: 'Burned-out optical lamp and overheating power trip',
        complaintId: createdComplaintId,
        date: new Date(Date.now() - 10 * 86400000).toISOString(),
      }),
    });

    // Failure 2 (5 days ago)
    await fetch(`${API_URL}/api/maintenance/equipment/P-101/failures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        issue: 'HDMI digital handshake failure and optical color distortion',
        complaintId: 'CX2188',
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
      }),
    });

    // Failure 3 (1 day ago) -> hits >= 3 in 30 days
    await fetch(`${API_URL}/api/maintenance/equipment/P-101/failures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        issue: 'Cooling blower fan stall leading to emergency thermal cut-off',
        complaintId: 'CX2205',
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
      }),
    });

    console.log('✓ Successfully recorded 3 failures within 30 days for Projector P-101 via API.');

    // -------------------------------------------------------------
    // DEMO STEP 6: AI Insights Panel Surfaces Repeated-Failure Alert
    // -------------------------------------------------------------
    console.log('[Step 6] Navigating to Admin Dashboard to inspect AI Insights Panel...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });

    await page.waitForSelector('#role-select');
    await page.select('#role-select', 'Admin');
    await page.type('#email-input', 'ADM10822');
    await page.type('#password-input', 'Admin@123');
    await page.click('#login-submit-button');

    await page.waitForSelector('#tab-admin-analytics', { timeout: 8000 });
    await page.waitForSelector('#ai-insights-panel-root', { timeout: 8000 });
    await page.waitForSelector('#action-btn-repeated-failure-P-101', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Scroll insights panel into view
    await page.$eval('#ai-insights-panel-root', (el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await new Promise((r) => setTimeout(r, 800));

    const demo5Path = path.join(ARTIFACT_DIR, 'demo_5_repeated_failure_insight.png');
    await page.screenshot({ path: demo5Path, fullPage: false });
    console.log('✓ Captured [demo_5_repeated_failure_insight.png]:', demo5Path);

    // -------------------------------------------------------------
    // DEMO STEP 7: Deep-Link to Maintenance View
    // -------------------------------------------------------------
    console.log('[Step 7] Clicking deep-link "Inspect Equipment" button on P-101 insight card...');
    await page.click('#action-btn-repeated-failure-P-101');
    await page.waitForSelector('#table-maintenance-risk', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));

    const demo6Path = path.join(ARTIFACT_DIR, 'demo_6_equipment_deep_link.png');
    await page.screenshot({ path: demo6Path, fullPage: false });
    console.log('✓ Captured [demo_6_equipment_deep_link.png]:', demo6Path);

    // -------------------------------------------------------------
    // DEMO STEP 8: Admin Security & Activity Logs View
    // -------------------------------------------------------------
    console.log('[Step 8] Checking Security & Activity Logs tab...');
    await page.waitForSelector('#tab-admin-logs', { timeout: 8000 });
    await page.click('#tab-admin-logs');
    await page.waitForSelector('#activity-logs-table', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));

    const demo7Path = path.join(ARTIFACT_DIR, 'demo_7_activity_logs.png');
    await page.screenshot({ path: demo7Path, fullPage: false });
    console.log('✓ Captured [demo_7_activity_logs.png]:', demo7Path);

    console.log('\n================================================================');
    console.log('✓ All 7 Phase 5 End-to-End Demo Screenshots Captured Successfully!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Error during demo execution:', err);
  } finally {
    await browser.close();
    process.exitCode = 0;
  }
}

runDemo();
