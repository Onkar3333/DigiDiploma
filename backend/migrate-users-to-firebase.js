import { db, isFirebaseReady } from './lib/firebase.js';
import FirebaseUser from './models/FirebaseUser.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const backendEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

// Wait for Firebase
await new Promise(resolve => setTimeout(resolve, 3000));

console.log('\n👥 Migrating Users to Firebase\n');
console.log('═══════════════════════════════════════');

if (!isFirebaseReady || !db) {
  console.log('❌ Firebase is not ready');
  process.exit(1);
}

try {
  // Read users from JSON file
  const usersJsonPath = path.join(__dirname, 'database', 'users.json');
  if (!fs.existsSync(usersJsonPath)) {
    console.log('❌ users.json file not found at:', usersJsonPath);
    process.exit(1);
  }

  const usersData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
  console.log(`📚 Found ${usersData.length} users in JSON file\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const userData of usersData) {
    try {
      // Check if user already exists
      const existing = await FirebaseUser.findOne({ 
        $or: [{ email: userData.email }, { studentId: userData.studentId }] 
      });

      if (existing) {
        console.log(`⏭️  Skipping ${userData.email} - already exists`);
        skipped++;
        continue;
      }

      // Create user in Firebase
      const created = await FirebaseUser.create({
        name: userData.name,
        email: userData.email,
        password: userData.password, // Already hashed
        college: userData.college || 'Digital Gurukul',
        studentId: userData.studentId,
        branch: userData.branch || 'Computer Engineering',
        semester: userData.semester || null,
        userType: userData.userType || 'student'
      });

      console.log(`✅ Imported: ${userData.email} (${userData.userType})`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed to import ${userData.email}:`, error.message);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('═══════════════════════════════════════\n');

  if (imported > 0) {
    console.log('💡 You can now log in with:');
    usersData.slice(0, 3).forEach(user => {
      console.log(`   - ${user.email} (${user.userType})`);
    });
    console.log('\n');
  }

} catch (error) {
  console.error('❌ Migration error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

