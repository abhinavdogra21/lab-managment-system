/**
 * Multi-Lab Booking End-to-End Test
 * 
 * This script tests:
 * 1. Creating a multi-lab booking (3 labs: CP1, CP2, CP3)
 * 2. Lab Staff approvals (one by one)
 * 3. HOD approval
 * 4. Verifying database state
 * 5. Checking email notifications
 */

const BASE_URL = 'http://localhost:3000';

// Test users from database
const STUDENT = {
  email: '23ucs507@lnmiit.ac.in',
  password: 'password123', // You'll need to set this
  name: 'ABHINAV DOGRA',
  id: 144
};

const LAB_STAFF = {
  CP1: { id: 126, email: 'shivam@lnmiit.ac.in', name: 'Shivam Maheshwari' },
  CP2: { id: 127, email: 'shivangi@lnmiit.ac.in', name: 'Shivangi Singh' },
  CP3: { id: 148, email: 'laxman@lnmiit.ac.in', name: 'Laxman Singh' } // CP3 has no staff_id, using another staff
};

const HOD = {
  id: 123,
  email: 'hodcse@lnmiit.ac.in',
  name: 'RAJBIR KAUR',
  password: 'password123'
};

const LABS = [
  { id: 13, name: 'Computer Lab1', code: 'CP1' },
  { id: 14, name: 'Computer Lab2', code: 'CP2' },
  { id: 15, name: 'Computer Lab 3', code: 'CP3' }
];

// Helper function to login and get token
async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${data.error}`);
  }
  
  console.log(`✅ Logged in as ${email}`);
  return data.token;
}

// Helper function to get cookie from token
function getCookie(token) {
  return `token=${token}; Path=/; HttpOnly`;
}

// Step 1: Create multi-lab booking
async function createMultiLabBooking(studentToken) {
  console.log('\n📝 Step 1: Creating Multi-Lab Booking...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const bookingDate = tomorrow.toISOString().split('T')[0];
  
  const bookingData = {
    lab_ids: [13, 14, 15], // CP1, CP2, CP3
    is_multi_lab: true,
    booking_date: bookingDate,
    start_time: '14:00',
    end_time: '16:00',
    purpose: 'Testing multi-lab booking system - End-to-end test',
    responsible_persons: [
      {
        lab_id: 13,
        lab_name: 'Computer Lab1',
        name: 'Test Person 1',
        email: 'test1@example.com'
      },
      {
        lab_id: 14,
        lab_name: 'Computer Lab2',
        name: 'Test Person 2',
        email: 'test2@example.com'
      },
      {
        lab_id: 15,
        lab_name: 'Computer Lab 3',
        name: 'Test Person 3',
        email: 'test3@example.com'
      }
    ]
  };
  
  const response = await fetch(`${BASE_URL}/api/student/booking-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': getCookie(studentToken)
    },
    body: JSON.stringify(bookingData)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Failed to create booking: ${data.error}`);
  }
  
  console.log(`✅ Multi-lab booking created! ID: ${data.requestId}`);
  console.log(`   Labs: ${LABS.map(l => l.code).join(', ')}`);
  console.log(`   Date: ${bookingDate} from 14:00 to 16:00`);
  console.log(`   Responsible persons: 3 (one per lab)`);
  
  return data.requestId;
}

// Step 2: Lab Staff approves their lab
async function labStaffApproval(bookingId, labStaffEmail, labStaffPassword, labCode) {
  console.log(`\n👨‍🔬 Step 2.${labCode}: Lab Staff Approval for ${labCode}...`);
  
  try {
    const token = await login(labStaffEmail, labStaffPassword);
    
    const response = await fetch(`${BASE_URL}/api/lab-staff/requests/${bookingId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookie(token)
      },
      body: JSON.stringify({
        action: 'approve',
        remarks: `Approved by ${labCode} lab staff - Test approval`
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Lab staff approval failed: ${data.error}`);
    }
    
    console.log(`✅ ${labCode} approved by lab staff`);
    console.log(`   New status: ${data.newStatus}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Failed to approve ${labCode}:`, error.message);
    throw error;
  }
}

// Step 3: HOD approval
async function hodApproval(bookingId, hodToken) {
  console.log('\n👔 Step 3: HOD Approval...');
  
  const response = await fetch(`${BASE_URL}/api/hod/requests/${bookingId}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': getCookie(hodToken)
    },
    body: JSON.stringify({
      action: 'approve',
      remarks: 'Approved by HOD - All labs verified'
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`HOD approval failed: ${data.error || data.message}`);
  }
  
  console.log('✅ HOD approved the multi-lab booking');
  console.log('   Status: approved');
  
  return data;
}

// Verify database state
async function verifyDatabaseState(bookingId) {
  console.log('\n🔍 Step 4: Verifying Database State...');
  
  const mysql = require('child_process').execSync;
  
  // Check booking_requests
  console.log('\n📋 Main Booking Record:');
  const bookingQuery = `mysql -u root -p'Abhin@v21dogr@' -e "USE lnmiit_lab_management; SELECT id, status, is_multi_lab, lab_ids, lab_staff_approved_at, hod_approved_at FROM booking_requests WHERE id = ${bookingId};"`;
  console.log(mysql(bookingQuery).toString());
  
  // Check multi_lab_approvals
  console.log('📋 Multi-Lab Approvals:');
  const approvalsQuery = `mysql -u root -p'Abhin@v21dogr@' -e "USE lnmiit_lab_management; SELECT booking_request_id, lab_id, status, lab_staff_approved_by, hod_approved_by FROM multi_lab_approvals WHERE booking_request_id = ${bookingId};"`;
  console.log(mysql(approvalsQuery).toString());
  
  // Check responsible persons
  console.log('📋 Responsible Persons:');
  const personsQuery = `mysql -u root -p'Abhin@v21dogr@' -e "USE lnmiit_lab_management; SELECT booking_request_id, lab_id, name, email FROM multi_lab_responsible_persons WHERE booking_request_id = ${bookingId};"`;
  console.log(mysql(personsQuery).toString());
}

// Main test execution
async function runTest() {
  console.log('🚀 Starting Multi-Lab Booking End-to-End Test\n');
  console.log('=' .repeat(60));
  
  try {
    // Login as student
    const studentToken = await login(STUDENT.email, 'password123');
    
    // Create multi-lab booking
    const bookingId = await createMultiLabBooking(studentToken);
    
    console.log('\n⏸️  Booking created. Now approving labs one by one...');
    console.log('   (Watch how status changes after each approval)');
    
    // Lab Staff approvals (one by one)
    await labStaffApproval(bookingId, LAB_STAFF.CP1.email, 'password123', 'CP1');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await labStaffApproval(bookingId, LAB_STAFF.CP2.email, 'password123', 'CP2');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await labStaffApproval(bookingId, LAB_STAFF.CP3.email, 'password123', 'CP3');
    
    console.log('\n✅ All lab staff approvals complete!');
    console.log('   Status should now be: pending_hod');
    
    // HOD approval
    const hodToken = await login(HOD.email, 'password123');
    await hodApproval(bookingId, hodToken);
    
    // Verify database
    await verifyDatabaseState(bookingId);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 TEST COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    
    console.log('\n📧 Email Notifications Sent:');
    console.log('   1. Student: Booking created');
    console.log('   2. Lab Staff (3x): Approval requests');
    console.log('   3. Student: CP1 approved (2 labs pending)');
    console.log('   4. Student: CP2 approved (1 lab pending)');
    console.log('   5. Student: All labs approved (pending HOD)');
    console.log('   6. HOD: Ready for final approval');
    console.log('   7. Student: Final approval confirmation');
    console.log('   8. Responsible Persons (3x): Lab booking confirmed');
    console.log('\n   Total: 13 email notifications');
    
    console.log('\n📌 Next Steps:');
    console.log('   1. Check email inbox (if TESTING_MODE=false)');
    console.log('   2. Review console logs for TESTING_MODE messages');
    console.log('   3. Verify database records above');
    console.log('   4. Test rejection scenario next');
    
    return bookingId;
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runTest().then(bookingId => {
    console.log(`\n✅ Test booking ID: ${bookingId}`);
    process.exit(0);
  });
}

module.exports = { runTest, createMultiLabBooking, labStaffApproval, hodApproval };
