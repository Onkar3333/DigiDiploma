import { db } from '../lib/firebase.js';
import FirebaseUser from '../models/FirebaseUser.js';
import bcrypt from 'bcryptjs';

async function ensureAdmin(email, password) {
  // Try to find existing admin by email
  const existing = await FirebaseUser.findOne({ $or: [{ email }, { studentId: 'ADMIN001' }] });

  const hashed = await FirebaseUser.hashPassword(password);

  if (existing) {
    // Update password and ensure admin role
    await db.collection('users').doc(existing.id).update({
      password: hashed,
      userType: 'admin',
      branch: existing.branch || 'Administration',
      semester: existing.semester ?? 'N/A',
      updatedAt: new Date()
    });
    return { id: existing.id, updated: true };
  }

  // Create new admin
  const adminUser = await FirebaseUser.create({
    name: 'Admin User',
    email,
    password: hashed, // hashed already
    college: 'Digital Gurukul',
    studentId: 'ADMIN001',
    branch: 'Administration',
    semester: 'N/A',
    userType: 'admin'
  });
  return { id: adminUser.id, created: true };
}

async function main() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@eduportal.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const result = await ensureAdmin(email, password);
    console.log('Admin ready:', { email, ...result });
    process.exit(0);
  } catch (err) {
    console.error('Failed to create/update admin:', err);
    process.exit(1);
  }
}

// Run the main function
main();


