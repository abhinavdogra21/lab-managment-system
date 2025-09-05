const mysql = require('mysql2/promise');

async function checkHodUser() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Abhin@v21dogr@',
      database: 'lnmiit_lab_management'
    });

    console.log('Connected to database');

    // Check if HOD user exists
    const [rows] = await connection.execute(
      'SELECT id, email, name, role, department, password_hash FROM users WHERE email = ?',
      ['hod.cse@lnmiit.ac.in']
    );

    if (rows.length > 0) {
      console.log('HOD user found:');
      console.log('ID:', rows[0].id);
      console.log('Email:', rows[0].email);
      console.log('Name:', rows[0].name);
      console.log('Role:', rows[0].role);
      console.log('Department:', rows[0].department);
      console.log('Password hash exists:', !!rows[0].password_hash);
      console.log('Password hash:', rows[0].password_hash);
    } else {
      console.log('HOD user NOT found. Creating it...');
      
      // Insert the HOD user
      await connection.execute(
        'INSERT INTO users (email, password_hash, name, role, department, employee_id) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'hod.cse@lnmiit.ac.in',
          '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
          'Dr. Rajesh Kumar',
          'hod',
          'CSE',
          'EMP002'
        ]
      );
      console.log('HOD user created successfully');
    }

    // Also check all users
    const [allUsers] = await connection.execute('SELECT email, role FROM users ORDER BY role, email');
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`${user.email} - ${user.role}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkHodUser();
