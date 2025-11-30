import FirebaseUser from '../models/FirebaseUser.js';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.env.EMAIL || 'admin@eduportal.com';
  const password = process.env.PASSWORD || 'admin123';
  try {
    const user = await FirebaseUser.findOne({ $or: [{ email }, { studentId: email }] });
    if (!user) {
      console.log('User not found for', email);
      process.exit(2);
    }
    const ok = await bcrypt.compare(password, user.password);
    console.log('Found user:', { id: user.id, email: user.email, userType: user.userType, branch: user.branch });
    console.log('Password match:', ok);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('Error:', e);
    process.exit(3);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}


