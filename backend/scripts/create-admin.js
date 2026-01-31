import bcrypt from 'bcryptjs';
import { connectMongoDB } from '../lib/mongodb.js';
import User, { MongoUser } from '../models/User.js';

async function ensureAdmin(email, password) {
  // Normalize email
  const normalizedEmail = email.toLowerCase();

  // Try to find existing admin/user by email or ADMIN001 studentId
  let existing = await MongoUser.findOne({
    $or: [{ email: normalizedEmail }, { studentId: 'ADMIN001' }],
  });

  const hashed = await bcrypt.hash(password, 10);

  if (existing) {
    // Update password and ensure admin role
    existing.password = hashed;
    existing.userType = 'admin';
    existing.branch = existing.branch || 'Administration';
    existing.semester = existing.semester ?? null;
    await existing.save();
    return { id: existing.id, updated: true };
  }

  // Create new admin (MongoUser.create will hash again, so pass plain password)
  const adminUser = await MongoUser.create({
    name: 'Admin User',
    email: normalizedEmail,
    password,
    college: 'Digital Gurukul',
    studentId: 'ADMIN001',
    branch: 'Administration',
    semester: 0,
    userType: 'admin',
  });
  return { id: adminUser.id, created: true };
}

async function main() {
  try {
    const connected = await connectMongoDB();
    if (!connected) {
      throw new Error('MongoDB connection failed. Cannot create admin user.');
    }

    const email = process.env.ADMIN_EMAIL || 'admin@digidiploma.in';
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

    const result = await ensureAdmin(email, password);
    console.log('✅ Admin ready:', { email, ...result });
    process.exit(0);
  } catch (err) {
    console.error('Failed to create/update admin:', err);
    process.exit(1);
  }
}

// Run the main function
main();

