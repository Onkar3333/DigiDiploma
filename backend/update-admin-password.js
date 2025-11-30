import bcrypt from 'bcryptjs';
import fs from 'fs/promises';

const updateAdminPassword = async () => {
  try {
    // Read current users
    const usersData = await fs.readFile('database/users.json', 'utf8');
    const users = JSON.parse(usersData);
    
    // Find admin user
    const adminUser = users.find(u => u.email === 'admin@eduportal.com');
    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }
    
    // Generate new password hash
    const newPassword = 'admin123';
    const newHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    adminUser.password = newHash;
    
    // Save back to file
    await fs.writeFile('database/users.json', JSON.stringify(users, null, 2));
    
    console.log('Admin password updated successfully');
    console.log('New hash:', newHash);
    
    // Test the new password
    const isValid = await bcrypt.compare(newPassword, newHash);
    console.log('New password is valid:', isValid);
    
  } catch (error) {
    console.error('Error updating password:', error);
  }
};

updateAdminPassword();
