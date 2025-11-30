import bcrypt from 'bcryptjs';

const testPassword = async () => {
  const password = 'admin123';
  const hash = '$2b$10$VtHXml56qDNmMShONGH8e.w8zK8gn.0AHz3a94z93mUYo5QiGxG5a';
  
  console.log('Testing password:', password);
  console.log('Against hash:', hash);
  
  const isValid = await bcrypt.compare(password, hash);
  console.log('Password is valid:', isValid);
  
  // Also test creating a new hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash for admin123:', newHash);
  
  const isValidNew = await bcrypt.compare(password, newHash);
  console.log('New hash is valid:', isValidNew);
};

testPassword().catch(console.error);
