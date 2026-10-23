const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\chand\\.gemini\\antigravity\\brain\\71baf9de-7433-4182-be82-3b324294c6c5';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function captureAllFigures() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1000'],
    defaultViewport: { width: 1440, height: 1000 },
  });

  const page = await browser.newPage();

  // Helper to log in with given credentials
  async function login(role, identifier, password) {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#role-select');
    await page.select('#role-select', role);
    await page.type('#email-input', identifier);
    await page.type('#password-input', password);
    await page.click('#login-submit-button');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
  }

  try {
    // -------------------------------------------------------------
    // Figure 8.1: Unified LPU Portal Login Interface
    // -------------------------------------------------------------
    console.log('[1/13] Capturing fig_8_1_login_screen.png...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#role-select');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_1_login_screen.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.2: Student Dashboard Console
    // -------------------------------------------------------------
    console.log('[2/13] Capturing fig_8_2_student_dashboard.png...');
    await login('Student', '12345678', 'Student@123');
    await page.waitForSelector('#tab-report-problem', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_2_student_dashboard.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.6: Complaint Detail View & Timeline
    // -------------------------------------------------------------
    console.log('[6/13] Capturing fig_8_6_complaint_detail_timeline.png...');
    await page.click('#tab-my-complaints');
    await new Promise((r) => setTimeout(r, 1200));
    // Click on the first complaint in list to open detail/timeline if clickable
    const complaintCard = await page.$('.cursor-pointer, .space-y-3 > div');
    if (complaintCard) {
      await complaintCard.click();
      await new Promise((r) => setTimeout(r, 800));
    }
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_6_complaint_detail_timeline.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.7: Live Virtual Token Card
    // -------------------------------------------------------------
    console.log('[7/13] Capturing fig_8_7_queue_token_status.png...');
    await page.click('#tab-student-queue');
    await new Promise((r) => setTimeout(r, 1200));
    // Attempt join Accounts Office if no active token
    const joinBtn = await page.$('#join-queue-a');
    if (joinBtn) {
      await joinBtn.click();
      await new Promise((r) => setTimeout(r, 1500));
    }
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_7_queue_token_status.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.8: 5-Stage Document Lifecycle Stepper
    // -------------------------------------------------------------
    console.log('[8/13] Capturing fig_8_8_service_request_stepper.png...');
    await page.click('#tab-student-services');
    await new Promise((r) => setTimeout(r, 1000));
    // Switch to tracker tab if exists
    const trackerTabBtn = await page.$('#subtab-service-tracker');
    if (trackerTabBtn) {
      await trackerTabBtn.click();
      await new Promise((r) => setTimeout(r, 1200));
    }
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_8_service_request_stepper.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.9: Campus Facilities Catalogue & Utilization
    // -------------------------------------------------------------
    console.log('[9/13] Capturing fig_8_9_resource_availability.png...');
    await page.click('#tab-student-resources');
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_9_resource_availability.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.12: CampusX AI Assistant Chat
    // -------------------------------------------------------------
    console.log('[12/13] Capturing fig_8_12_ai_assistant_chat.png...');
    const assistantBtn = await page.$('#campusx-assistant-trigger-btn');
    if (assistantBtn) {
      await assistantBtn.click();
      await page.waitForSelector('#campusx-assistant-modal', { timeout: 5000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));

      const inputSelector = '#campusx-assistant-modal input[type="text"]';
      if (await page.$(inputSelector)) {
        await page.type(inputSelector, 'Where is my application?');
        await page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_12_ai_assistant_chat.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.3: Faculty / Staff Console
    // -------------------------------------------------------------
    console.log('[3/13] Capturing fig_8_3_faculty_dashboard.png...');
    await login('Faculty/Staff', 'EMP20491', 'Faculty@123');
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_3_faculty_dashboard.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.4: Central Admin Operations Dashboard
    // -------------------------------------------------------------
    console.log('[4/13] Capturing fig_8_4_admin_dashboard.png...');
    await login('Admin', 'ADM10822', 'Admin@123');
    await page.waitForSelector('#tab-admin-analytics', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_4_admin_dashboard.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.11: Admin AI Insights Panel
    // -------------------------------------------------------------
    console.log('[11/13] Capturing fig_8_11_ai_insights_panel.png...');
    // Scroll down to the AI Insights section on Admin Dashboard
    await page.evaluate(() => {
      window.scrollTo({ top: 750, behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_11_ai_insights_panel.png'),
      fullPage: false,
    });

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    // -------------------------------------------------------------
    // Figure 8.10: Predictive Maintenance Equipment Matrix
    // -------------------------------------------------------------
    console.log('[10/13] Capturing fig_8_10_maintenance_risk_table.png...');
    await page.click('#tab-admin-maintenance');
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_10_maintenance_risk_table.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.13: Tamper-Evident Administrative Activity Logs
    // -------------------------------------------------------------
    console.log('[13/13] Capturing fig_8_13_activity_logs.png...');
    await page.click('#tab-admin-logs');
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_13_activity_logs.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Figure 8.5: Super Admin Oversight View
    // -------------------------------------------------------------
    console.log('[5/13] Capturing fig_8_5_superadmin_dashboard.png...');
    await login('Super Admin', 'DIR001', 'SuperAdmin@123');
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'fig_8_5_superadmin_dashboard.png'),
      fullPage: false,
    });

    console.log('All 13 figures captured successfully!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

captureAllFigures();
