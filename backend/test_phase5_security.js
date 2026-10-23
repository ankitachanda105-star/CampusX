// backend/test_phase5_security.js
// Automated verification for Phase 5 Security Pass

const BASE_URL = 'http://127.0.0.1:5000';

async function runSecurityTests() {
  console.log('=== Starting Phase 5 Security Verification ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated access to protected equipment route
    const unauthRes = await fetch(`${BASE_URL}/api/maintenance/equipment`);
    assert(unauthRes.status === 401, 'Unauthenticated access to /api/maintenance/equipment returns 401');

    // 2. Student login
    const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_number: '12345678',
        password: 'Student@123'
      })
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200 && studentLoginData.success, 'Student login succeeded');
    const studentToken = studentLoginData.token || (studentLoginData.data && studentLoginData.data.token);
    const studentUser = studentLoginData.user || (studentLoginData.data && studentLoginData.data.user);
    assert(!studentUser.password, 'Password hash is NOT exposed in student login response');

    // 3. Student RBAC barrier on /api/maintenance/equipment
    const studentEquipRes = await fetch(`${BASE_URL}/api/maintenance/equipment`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentEquipRes.status === 403, 'Student access to /api/maintenance/equipment is blocked with 403 Forbidden');

    // 4. Student RBAC barrier on /api/admin/activity-logs
    const studentLogsRes = await fetch(`${BASE_URL}/api/admin/activity-logs`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentLogsRes.status === 403, 'Student access to /api/admin/activity-logs is blocked with 403 Forbidden');

    // 5. Privilege escalation attempt during registration
    const escalateRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker User',
        registration_number: `HACK${Date.now().toString().slice(-4)}`,
        email: `attacker${Date.now()}@lpu.in`,
        password: 'Password@123',
        role: 'Admin',
        department: 'CSE'
      })
    });
    const escalateData = await escalateRes.json();
    assert(escalateRes.status === 403 && escalateData.message.includes('Privilege escalation blocked'), 'Privilege escalation to Admin in registration returns 403');

    // 6. Malicious file upload rejection (.exe executable)
    const formData = new FormData();
    formData.append('title', 'Projector Malfunction Testing');
    formData.append('description', 'Detailed description of the hardware breakdown in Block 34 Room 215');
    formData.append('block', 'Block 34');
    formData.append('roomLab', 'Room 215');
    formData.append('department', 'CSE');
    const fakeExeBlob = new Blob(['MZ fake binary executable header'], { type: 'application/x-msdownload' });
    formData.append('image', fakeExeBlob, 'exploit.exe');

    const uploadRes = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`
      },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 400 && uploadData.message.includes('prohibited'), 'Dangerous executable file upload (.exe) is rejected with 400');

    // 7. Student RBAC barrier on resource booking
    const studentBookRes = await fetch(`${BASE_URL}/api/resources/book`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resourceId: 'res_test',
        bookingDate: '2026-09-25',
        startTime: '10:00',
        endTime: '11:00',
        eventName: 'Student Event'
      })
    });
    assert(studentBookRes.status === 403, 'Student cannot directly book resources without faculty/staff privileges (403)');

    // 8. Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ADM10822',
        password: 'Admin@123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.success, 'Admin login succeeded');
    const adminToken = adminLoginData.token || (adminLoginData.data && adminLoginData.data.token);

    // 9. Input validation: Resource booking invalid date format
    const invalidBookRes = await fetch(`${BASE_URL}/api/resources/book`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resourceId: 'res_test',
        bookingDate: '20-09-2026', // wrong format, should be YYYY-MM-DD
        startTime: '10:00',
        endTime: '11:00',
        eventName: 'Staff Meeting'
      })
    });
    const invalidBookData = await invalidBookRes.json();
    assert(invalidBookRes.status === 400 && invalidBookData.message.includes('YYYY-MM-DD'), 'Invalid date format in resource booking rejected with 400');

    const activityLogsRes = await fetch(`${BASE_URL}/api/admin/activity-logs?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const activityLogsData = await activityLogsRes.json();
    assert(activityLogsRes.status === 200 && activityLogsData.success, 'Admin can successfully query /api/admin/activity-logs');
    const logsList = activityLogsData.logs || (activityLogsData.data && activityLogsData.data.logs) || [];
    assert(Array.isArray(logsList) && logsList.length > 0, 'Activity logs are being populated in database');

    const recentActions = logsList.map(l => l.action);
    assert(recentActions.includes('LOGIN'), 'Activity logs record user LOGIN events');

    console.log(`\n=== Verification Summary: ${passed} PASSED, ${failed} FAILED ===`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runSecurityTests();
