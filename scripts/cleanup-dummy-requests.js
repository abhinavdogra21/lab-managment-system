#!/usr/bin/env node

async function cleanupDummyRequests() {
  // Use dynamic import for ES modules
  const { Database } = await import('../lib/database.js');
  const db = Database.getInstance();
  
  try {
    console.log('🔍 Checking for dummy booking requests...');
    
    // First, let's see what requests exist
    const allRequests = await db.query('SELECT * FROM booking_requests');
    console.log(`Found ${allRequests.rows.length} total booking requests`);
    
    if (allRequests.rows.length > 0) {
      console.log('\n📋 Current booking requests:');
      allRequests.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}, Student: ${row.requested_by}, Purpose: "${row.purpose}", Status: ${row.status}`);
      });
      
      // Identify potential dummy requests
      // These could be requests with test purposes, or test student IDs
      const dummyKeywords = [
        'test', 'dummy', 'example', 'sample', 'demo',
        'Database project testing', 'Network configuration lab', 
        'Software development project demo', 'Machine learning algorithm testing'
      ];
      
      const potentialDummyRequests = allRequests.rows.filter(row => {
        const purpose = row.purpose ? row.purpose.toLowerCase() : '';
        return dummyKeywords.some(keyword => purpose.includes(keyword.toLowerCase()));
      });
      
      if (potentialDummyRequests.length > 0) {
        console.log(`\n🗑️  Found ${potentialDummyRequests.length} potential dummy requests:`);
        potentialDummyRequests.forEach(row => {
          console.log(`   - ID: ${row.id}, Purpose: "${row.purpose}"`);
        });
        
        // Delete them
        const deletePromises = potentialDummyRequests.map(row => 
          db.query('DELETE FROM booking_requests WHERE id = ?', [row.id])
        );
        
        await Promise.all(deletePromises);
        console.log(`✅ Deleted ${potentialDummyRequests.length} dummy requests`);
      } else {
        console.log('✅ No obvious dummy requests found');
      }
    } else {
      console.log('✅ No booking requests found in database');
    }
    
    // Also check for any requests with non-existent user IDs (orphaned data)
    const orphanedRequests = await db.query(`
      SELECT br.* FROM booking_requests br 
      LEFT JOIN users u ON br.requested_by = u.id 
      WHERE u.id IS NULL
    `);
    
    if (orphanedRequests.rows.length > 0) {
      console.log(`\n🧹 Found ${orphanedRequests.rows.length} orphaned requests (no matching user):`);
      orphanedRequests.rows.forEach(row => {
        console.log(`   - ID: ${row.id}, Student ID: ${row.requested_by}, Purpose: "${row.purpose}"`);
      });
      
      const deleteOrphanedPromises = orphanedRequests.rows.map(row => 
        db.query('DELETE FROM booking_requests WHERE id = ?', [row.id])
      );
      
      await Promise.all(deleteOrphanedPromises);
      console.log(`✅ Deleted ${orphanedRequests.rows.length} orphaned requests`);
    }
    
    console.log('\n🎉 Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  process.exit(0);
}

cleanupDummyRequests();
