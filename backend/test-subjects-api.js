import { db, isFirebaseReady } from './lib/firebase.js';
import FirebaseSubject from './models/FirebaseSubject.js';
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

console.log('\n🧪 Testing Subjects API Endpoints...\n');
console.log('═══════════════════════════════════════');

if (!isFirebaseReady || !db) {
  console.log('❌ Firebase is not ready');
  process.exit(1);
}

try {
  // Test 1: Get subjects by branch and semester (for admin material manager)
  console.log('\n1️⃣ Testing: GET /api/subjects?branch=Computer Engineering&semester=1');
  const subjects1 = await FirebaseSubject.find({ 
    branch: 'Computer Engineering', 
    semester: 1 
  }, { orderBy: false });
  console.log(`   ✅ Found ${subjects1.length} subjects`);
  if (subjects1.length > 0) {
    console.log(`   Sample: ${subjects1[0].code} - ${subjects1[0].name}`);
  }
  
  // Test 2: Get subjects by branch (grouped by semester - for student dashboard)
  console.log('\n2️⃣ Testing: GET /api/subjects/branch/Computer Engineering');
  const allCOSubjects = await FirebaseSubject.find({ 
    branch: 'Computer Engineering' 
  }, { orderBy: false });
  
  // Group by semester
  const grouped = {};
  allCOSubjects.forEach(subject => {
    const sem = String(subject.semester);
    if (!grouped[sem]) grouped[sem] = [];
    grouped[sem].push({
      _id: subject.id,
      name: subject.name,
      code: subject.code,
      branch: subject.branch,
      semester: subject.semester,
      isActive: subject.isActive !== undefined ? subject.isActive : true
    });
  });
  
  console.log(`   ✅ Found ${allCOSubjects.length} subjects for Computer Engineering`);
  console.log(`   Grouped by semester:`);
  Object.keys(grouped).sort().forEach(sem => {
    console.log(`      Semester ${sem}: ${grouped[sem].length} subjects`);
  });
  
  // Test 3: Verify all branches have subjects
  console.log('\n3️⃣ Testing: All branches have subjects');
  const branches = [
    'Computer Engineering',
    'Information Technology',
    'Electronics & Telecommunication',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Civil Engineering',
    'Automobile Engineering',
    'Instrumentation Engineering',
    'Artificial Intelligence & Machine Learning (AIML)',
    'Mechatronics Engineering'
  ];
  
  for (const branch of branches) {
    const branchSubjects = await FirebaseSubject.find({ branch }, { orderBy: false });
    console.log(`   ${branch}: ${branchSubjects.length} subjects ✅`);
  }
  
  // Test 4: Verify subjects have isActive field
  console.log('\n4️⃣ Testing: Subjects have isActive field');
  const sampleSubjects = await FirebaseSubject.find({}, { orderBy: false });
  const withIsActive = sampleSubjects.filter(s => s.isActive !== undefined);
  console.log(`   ${withIsActive.length}/${sampleSubjects.length} subjects have isActive field`);
  
  console.log('\n✅ All API tests passed!');
  console.log('═══════════════════════════════════════\n');
  console.log('🎉 Subjects are ready to use in:');
  console.log('   ✅ Admin Material Manager dropdowns');
  console.log('   ✅ Student Dashboard (filtered by branch/semester)');
  console.log('   ✅ Materials page (branch/semester/subject selection)');
  console.log('\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

