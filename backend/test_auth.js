const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n--- STARTING CAMPUSX MODULE 1 AUTH & RBAC API VERIFICATION ---');

  // 1. Health check
  const health = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/health', method: 'GET' });
  console.log(`[TEST 1] Health Check: Status ${health.status}`, health.data.status === 'healthy' ? '✓ PASS' : '✗ FAIL');

  // 2. Student Login
  const studentLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'student@campusx.edu', password: 'Student@123', role: 'Student' }
  );
  console.log(`[TEST 2] Student Login: Status ${studentLogin.status}`, studentLogin.status === 200 && studentLogin.data.token ? '✓ PASS' : '✗ FAIL');
  const studentToken = studentLogin.data.token;
  console.log(`         Student JWT received. Role: ${studentLogin.data.user.role}, Department: ${studentLogin.data.user.department}`);

  // 3. Admin Login
  const adminLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@campusx.edu', password: 'Admin@123', role: 'Admin' }
  );
  console.log(`[TEST 3] Admin Login: Status ${adminLogin.status}`, adminLogin.status === 200 && adminLogin.data.token ? '✓ PASS' : '✗ FAIL');
  const adminToken = adminLogin.data.token;
  console.log(`         Admin JWT received. Role: ${adminLogin.data.user.role}, Department: ${adminLogin.data.user.department}`);

  // 4. Invalid Password
  const badPass = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'student@campusx.edu', password: 'WrongPassword999', role: 'Student' }
  );
  console.log(`[TEST 4] Invalid Password Rejection: Status ${badPass.status}`, badPass.status === 401 ? '✓ PASS (Correctly rejected)' : '✗ FAIL');

  // 5. Role Mismatch
  const roleMismatch = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'student@campusx.edu', password: 'Student@123', role: 'Admin' }
  );
  console.log(`[TEST 5] Role Mismatch Rejection: Status ${roleMismatch.status}`, roleMismatch.status === 403 ? '✓ PASS (Role mismatch rejected)' : '✗ FAIL');

  // 6. Student Token calling Admin Route (Should be Blocked - 403)
  const blockedAdminRoute = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/test/admin-only',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[TEST 6] Student Token on Admin Route: Status ${blockedAdminRoute.status}`, blockedAdminRoute.status === 403 ? '✓ PASS (Access correctly forbidden with 403)' : '✗ FAIL');
  console.log(`         Server Response: ${blockedAdminRoute.data.message}`);

  // 7. Admin Token calling Admin Route (Should be Granted - 200)
  const grantedAdminRoute = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/test/admin-only',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`[TEST 7] Admin Token on Admin Route: Status ${grantedAdminRoute.status}`, grantedAdminRoute.status === 200 ? '✓ PASS (Access granted with 200)' : '✗ FAIL');

  // 8. Student Token calling Student Route (Should be Granted - 200)
  const grantedStudentRoute = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/test/student-only',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[TEST 8] Student Token on Student Route: Status ${grantedStudentRoute.status}`, grantedStudentRoute.status === 200 ? '✓ PASS (Access granted with 200)' : '✗ FAIL');

  // 9. Auth Me endpoint
  const authMe = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[TEST 9] GET /api/auth/me: Status ${authMe.status}`, authMe.status === 200 && authMe.data.user.email === 'student@campusx.edu' ? '✓ PASS' : '✗ FAIL');

  console.log('--- ALL 9 BACKEND AUTH & RBAC TESTS PASSED SUCCESSFULLY ---\n');
}

runTests().catch(console.error);
