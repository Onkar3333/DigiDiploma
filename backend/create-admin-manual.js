import FirebaseUser from './models/FirebaseUser.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const email = 'admin@eduportal.com';
    const password = 'admin123';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin user
    const adminUser = await FirebaseUser.create({
      name: 'Admin User',
      email: email,
      password: hashedPassword,
      college: 'Digital Gurukul',
      studentId: 'ADMIN001',
      branch: 'Administration',
      semester: 'N/A',
      userType: 'admin'
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', adminUser.id);
    
    // Verify the user was created
    const foundUser = await FirebaseUser.findOne({ email });
    if (foundUser) {
      console.log('✅ Verification: Admin user found in database');
      console.log('User type:', foundUser.userType);
    } else {
      console.log('❌ Verification failed: Admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdmin();
