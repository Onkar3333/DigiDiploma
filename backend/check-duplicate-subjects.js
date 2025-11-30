import { db, isFirebaseReady } from './lib/firebase.js';
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

console.log('\n🔍 Checking for duplicate/old test subjects\n');
console.log('═══════════════════════════════════════');

if (!isFirebaseReady || !db) {
  console.log('❌ Firebase is not ready');
  process.exit(1);
}

try {
  const snapshot = await db.collection('subjects')
    .where('branch', '==', 'Computer Engineering')
    .get();
  
  console.log(`\n📊 Total subjects for "Computer Engineering": ${snapshot.size}\n`);
  
  // Group by semester
  const bySemester = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    const sem = data.semester || 'unknown';
    if (!bySemester[sem]) {
      bySemester[sem] = [];
    }
    bySemester[sem].push({
      id: doc.id,
      code: data.code,
      name: data.name,
      semester: data.semester
    });
  });
  
  // Check for old test data (subjects with names like "Mathematics I", "Physics I", etc.)
  console.log('🔍 Looking for old test subjects...\n');
  const oldTestPatterns = ['Mathematics I', 'Physics I', 'Chemistry', 'Mathematics II', 'Data Structures', 'Database Systems'];
  
  Object.keys(bySemester).sort().forEach(sem => {
    const subjects = bySemester[sem];
    console.log(`\n📚 Semester ${sem}: ${subjects.length} subjects`);
    
    // Check for old test data
    const oldTestSubjects = subjects.filter(s => oldTestPatterns.includes(s.name));
    if (oldTestSubjects.length > 0) {
      console.log(`   ⚠️  Found ${oldTestSubjects.length} OLD TEST subjects:`);
      oldTestSubjects.forEach(s => {
        console.log(`      - ${s.code || 'NO CODE'} - ${s.name} (ID: ${s.id})`);
      });
    }
    
    // Show first few subjects
    console.log(`   First ${Math.min(5, subjects.length)} subjects:`);
    subjects.slice(0, 5).forEach((s, i) => {
      console.log(`      ${i + 1}. ${s.code || 'NO CODE'} - ${s.name}`);
    });
  });
  
  // Check if old test subjects need to be deleted
  const allOldTest = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (oldTestPatterns.includes(data.name)) {
      allOldTest.push({ id: doc.id, ...data });
    }
  });
  
  if (allOldTest.length > 0) {
    console.log(`\n⚠️  Found ${allOldTest.length} old test subjects that should be deleted:`);
    allOldTest.forEach(s => {
      console.log(`   - ${s.code || 'NO CODE'} - ${s.name} (ID: ${s.id}, Branch: ${s.branch}, Sem: ${s.semester})`);
    });
    console.log(`\n💡 To delete these, run: node backend/delete-old-test-subjects.js`);
  } else {
    console.log(`\n✅ No old test subjects found!`);
  }
  
  console.log('\n═══════════════════════════════════════\n');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

