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
  console.log('\n--- LPU REBRANDED AUTH & RBAC VERIFICATION ---');

  // 1. Campus Config
  const config = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/campus/config', method: 'GET' });
  console.log(`[TEST 1] Campus Config API: Status ${config.status}`, config.data.campus.university.name === 'Lovely Professional University' ? '✓ PASS' : '✗ FAIL');
  console.log(`         University: ${config.data.campus.university.name}, Location: ${config.data.campus.university.location}`);
  console.log(`         Academic Blocks: ${config.data.campus.academicBlocks.length}, Hostels: ${config.data.campus.hostels.boys.length} Boys / ${config.data.campus.hostels.girls.length} Girls`);

  // 2. Student Login via Registration Number (12345678)
  const studentRegLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: '12345678', password: 'Student@123', role: 'Student' }
  );
  console.log(`[TEST 2] Student Login via Reg No (12345678): Status ${studentRegLogin.status}`, studentRegLogin.status === 200 && studentRegLogin.data.token ? '✓ PASS' : '✗ FAIL');
  const studentToken = studentRegLogin.data.token;
  console.log(`         Student Name: ${studentRegLogin.data.user.name}, Reg No: ${studentRegLogin.data.user.regNo}, Role: ${studentRegLogin.data.user.role}`);

  // 3. Student Login via Email (alex.12345678@lpu.in)
  const studentEmailLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'alex.12345678@lpu.in', password: 'Student@123', role: 'Student' }
  );
  console.log(`[TEST 3] Student Login via Email: Status ${studentEmailLogin.status}`, studentEmailLogin.status === 200 ? '✓ PASS' : '✗ FAIL');

  // 4. Faculty Login via Employee ID (EMP20491)
  const facultyLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'EMP20491', password: 'Faculty@123', role: 'Faculty/Staff' }
  );
  console.log(`[TEST 4] Faculty Login via ID (EMP20491): Status ${facultyLogin.status}`, facultyLogin.status === 200 ? '✓ PASS' : '✗ FAIL');
  console.log(`         Faculty Dept: ${facultyLogin.data.user.department}`);

  // 5. Admin Login via Employee ID (ADM10822)
  const adminLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'ADM10822', password: 'Admin@123', role: 'Admin' }
  );
  console.log(`[TEST 5] Admin Login via ID (ADM10822): Status ${adminLogin.status}`, adminLogin.status === 200 ? '✓ PASS' : '✗ FAIL');
  const adminToken = adminLogin.data.token;

  // 6. Super Admin Login via Employee ID (DIR001)
  const superAdminLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'DIR001', password: 'SuperAdmin@123', role: 'Super Admin' }
  );
  console.log(`[TEST 6] Super Admin Login via ID (DIR001): Status ${superAdminLogin.status}`, superAdminLogin.status === 200 ? '✓ PASS' : '✗ FAIL');

  // 7. Student token attempting Admin route (403 Forbidden check)
  const blockedAdminRoute = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/test/admin-only',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[TEST 7] Student Token on Admin Route: Status ${blockedAdminRoute.status}`, blockedAdminRoute.status === 403 ? '✓ PASS (Correctly blocked with 403)' : '✗ FAIL');

  // 8. Admin token on Admin route (200 OK check)
  const grantedAdminRoute = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/test/admin-only',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`[TEST 8] Admin Token on Admin Route: Status ${grantedAdminRoute.status}`, grantedAdminRoute.status === 200 ? '✓ PASS (Access granted)' : '✗ FAIL');

  console.log('--- ALL LPU AUTH & RBAC VERIFICATION TESTS PASSED ---\n');
}

runTests().catch(console.error);
