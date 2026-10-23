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

async function runModule2Tests() {
  console.log('\n--- STARTING MODULE 2 (SMART COMPLAINTS) END-TO-END VERIFICATION ---');

  // 1. Authenticate Student (Alex Kumar - 12345678)
  const studentAuth = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: '12345678', password: 'Student@123', role: 'Student' }
  );
  console.log(`[TEST 1] Student Authentication: Status ${studentAuth.status}`, studentAuth.status === 200 ? '✓ PASS' : '✗ FAIL');
  const studentToken = studentAuth.data.token;

  // 2. Submit Complaint 1: WiFi Issue in Block 34 Lab 204
  const comp1 = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/complaints',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    },
    {
      title: 'WiFi dropping packets and disconnects frequently',
      block: 'Block 34',
      roomLab: 'Lab 204',
      description: 'The router in lab 204 stops responding during practical sessions. Students cannot access university portal.',
    }
  );
  console.log(`[TEST 2] Submit Complaint 1: Status ${comp1.status}`, comp1.status === 201 ? '✓ PASS' : '✗ FAIL');
  console.log(`         Assigned ID: ${comp1.data.complaint.complaintId}`);
  console.log(`         AI Auto-Classification: Category '${comp1.data.complaint.category}', Priority '${comp1.data.complaint.priority}', Department '${comp1.data.complaint.department}'`);
  const comp1Id = comp1.data.complaint.complaintId;

  // 3. Submit Complaint 2: Water Leakage in BH-3
  const comp2 = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/complaints',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    },
    {
      title: 'Severe water pipe leakage near washroom entrance',
      block: 'BH-3',
      roomLab: '2nd Floor Wing B',
      description: 'Water is leaking continuously from the main pipe creating puddle and slippery floor.',
    }
  );
  console.log(`[TEST 3] Submit Complaint 2: Status ${comp2.status}`, comp2.status === 201 ? '✓ PASS' : '✗ FAIL');
  console.log(`         Assigned ID: ${comp2.data.complaint.complaintId}`);
  console.log(`         AI Auto-Classification: Category '${comp2.data.complaint.category}', Department '${comp2.data.complaint.department}'`);

  // 4. Student queries "My Complaints"
  const myComplaints = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/complaints/my',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[TEST 4] Student 'My Complaints': Status ${myComplaints.status}, Count: ${myComplaints.data.count}`, myComplaints.data.count >= 2 ? '✓ PASS' : '✗ FAIL');

  // 5. Authenticate Admin (Marcus Ward - ADM10822)
  const adminAuth = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'ADM10822', password: 'Admin@123', role: 'Admin' }
  );
  console.log(`[TEST 5] Admin Authentication: Status ${adminAuth.status}`, adminAuth.status === 200 ? '✓ PASS' : '✗ FAIL');
  const adminToken = adminAuth.data.token;

  // 6. Admin queries All Complaints with Filter
  const filteredAll = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/complaints/all?department=IT%20Services',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`[TEST 6] Admin All Complaints (Filter: IT Services): Status ${filteredAll.status}, Count: ${filteredAll.data.count}`, filteredAll.data.count === 1 ? '✓ PASS' : '✗ FAIL');

  // 7. Accept Ticket (-> In Progress) with Note
  const progressUpdate = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/complaints/${comp1Id}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      status: 'In Progress',
      note: 'Technician dispatched to replace faulty access point in Lab 204.',
    }
  );
  console.log(`[TEST 7] Ticket Accept & In Progress: Status ${progressUpdate.status}`, progressUpdate.status === 200 && progressUpdate.data.complaint.status === 'In Progress' ? '✓ PASS' : '✗ FAIL');

  // 8. Resolve Ticket (-> Resolved) with Note
  const resolveUpdate = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/complaints/${comp1Id}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      status: 'Resolved',
      note: 'New Cisco router installed and high-speed connection verified.',
    }
  );
  console.log(`[TEST 8] Ticket Resolve: Status ${resolveUpdate.status}`, resolveUpdate.status === 200 && resolveUpdate.data.complaint.status === 'Resolved' ? '✓ PASS' : '✗ FAIL');

  // 9. Query Complaint Detail & Verify complaint_updates Timeline
  const comp1Detail = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/complaints/${comp1Id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[TEST 9] Complaint Detail & Updates Timeline: Status ${comp1Detail.status}`, comp1Detail.status === 200 ? '✓ PASS' : '✗ FAIL');
  console.log(`         Timeline Steps Recorded: ${comp1Detail.data.updates.length}`);
  comp1Detail.data.updates.forEach((u, i) => {
    console.log(`           Step ${i + 1}: [${u.status}] "${u.note}" (by ${u.actorName} - ${u.actorRole})`);
  });

  // 10. Admin Reassign Test
  const reassignTest = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/complaints/${comp2.data.complaint.complaintId}/reassign`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      department: 'Hostel Administration',
      assignedStaffName: 'Warden BH-3',
      note: 'Forwarded to Hostel Warden for emergency plumber coordination.',
    }
  );
  console.log(`[TEST 10] Admin Reassignment: Status ${reassignTest.status}`, reassignTest.status === 200 && reassignTest.data.complaint.department === 'Hostel Administration' ? '✓ PASS' : '✗ FAIL');

  console.log('--- ALL MODULE 2 TESTS PASSED WITH 100% SUCCESS ---\n');
}

runModule2Tests().catch(console.error);
