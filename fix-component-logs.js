const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Abhin@v21dogr@',
    database: 'lnmiit_lab_management'
  });
  
  console.log('=== UPDATING COMPONENT ACTIVITY LOGS ===');
  
  // Get all component activity logs
  const [logs] = await connection.execute(
    'SELECT id, entity_snapshot FROM component_activity_logs ORDER BY id'
  );
  
  let updated = 0;
  for (const log of logs) {
    const snapshot = typeof log.entity_snapshot === 'string' 
      ? JSON.parse(log.entity_snapshot) 
      : log.entity_snapshot;
    
    let needsUpdate = false;
    
    // If snapshot has hod_name but no lab_coordinator_name, and the hod_name is 'DR. SAURABH KUAMAR'
    // Then it's actually a lab coordinator approval
    if (snapshot.hod_name && snapshot.hod_name.includes('SAURABH') && !snapshot.lab_coordinator_name) {
      snapshot.lab_coordinator_name = snapshot.hod_name;
      snapshot.lab_coordinator_salutation = snapshot.hod_salutation || 'dr';
      snapshot.lab_coordinator_approved_at = snapshot.hod_approved_at;
      snapshot.final_approver_role = 'lab_coordinator';
      snapshot.highest_approval_authority = 'lab_coordinator';
      // Remove HOD fields since it was actually lab coordinator
      delete snapshot.hod_name;
      delete snapshot.hod_salutation;
      delete snapshot.hod_approved_at;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await connection.execute(
        'UPDATE component_activity_logs SET entity_snapshot = ? WHERE id = ?',
        [JSON.stringify(snapshot), log.id]
      );
      console.log(`Updated log ID ${log.id}`);
      updated++;
    }
  }
  
  console.log(`\nTotal logs updated: ${updated}`);
  
  // Now update the component_requests table to set final_approver_role
  console.log('\n=== UPDATING COMPONENT REQUESTS ===');
  const [requests] = await connection.execute(`
    SELECT cr.id, cr.hod_approver_id, l.department_id, d.highest_approval_authority, d.lab_coordinator_id
    FROM component_requests cr
    JOIN labs l ON cr.lab_id = l.id
    JOIN departments d ON l.department_id = d.id
    WHERE cr.status = 'approved' AND cr.final_approver_role IS NULL
  `);
  
  let requestsUpdated = 0;
  for (const req of requests) {
    // If department has lab_coordinator as highest authority, set final_approver_role
    if (req.highest_approval_authority === 'lab_coordinator') {
      await connection.execute(
        'UPDATE component_requests SET final_approver_role = ? WHERE id = ?',
        ['lab_coordinator', req.id]
      );
      console.log(`Updated component_request ID ${req.id} - set final_approver_role to lab_coordinator`);
      requestsUpdated++;
    } else {
      await connection.execute(
        'UPDATE component_requests SET final_approver_role = ? WHERE id = ?',
        ['hod', req.id]
      );
      console.log(`Updated component_request ID ${req.id} - set final_approver_role to hod`);
      requestsUpdated++;
    }
  }
  
  console.log(`\nTotal requests updated: ${requestsUpdated}`);
  
  await connection.end();
  console.log('\n✅ Database fix completed!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
