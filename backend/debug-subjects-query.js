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

console.log('\n🔍 Debugging Subjects Query for "Computer Engineering"\n');
console.log('═══════════════════════════════════════');

if (!isFirebaseReady || !db) {
  console.log('❌ Firebase is not ready');
  process.exit(1);
}

try {
  // Test 1: Query using FirebaseSubject.find (same as API)
  console.log('\n1️⃣ Testing FirebaseSubject.find({ branch: "Computer Engineering" })');
  const subjects1 = await FirebaseSubject.find({ branch: 'Computer Engineering' }, { orderBy: false });
  console.log(`   Found: ${subjects1.length} subjects`);
  if (subjects1.length > 0) {
    console.log(`   First 10 subjects:`);
    subjects1.slice(0, 10).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.code} - ${s.name} (Sem ${s.semester})`);
    });
  }
  
  // Test 2: Direct Firestore query
  console.log('\n2️⃣ Testing direct Firestore query');
  const snapshot = await db.collection('subjects')
    .where('branch', '==', 'Computer Engineering')
    .get();
  console.log(`   Found: ${snapshot.size} documents`);
  if (snapshot.size > 0) {
    console.log(`   First 10 documents:`);
    let count = 0;
    snapshot.forEach((doc) => {
      if (count < 10) {
        const data = doc.data();
        console.log(`   ${count + 1}. ${data.code || 'NO CODE'} - ${data.name || 'NO NAME'} (Sem ${data.semester || 'NO SEM'})`);
        count++;
      }
    });
  }
  
  // Test 3: Check all unique branch names
  console.log('\n3️⃣ Checking all unique branch names in Firebase');
  const allSnapshot = await db.collection('subjects').get();
  const branches = new Set();
  allSnapshot.forEach(doc => {
    const branch = doc.data().branch;
    if (branch) branches.add(branch);
  });
  console.log(`   Found ${branches.size} unique branches:`);
  Array.from(branches).sort().forEach(branch => {
    const count = allSnapshot.docs.filter(d => d.data().branch === branch).length;
    console.log(`   - "${branch}": ${count} subjects`);
  });
  
  // Test 4: Check if there are subjects with similar but different branch names
  console.log('\n4️⃣ Checking for similar branch names');
  const computerBranches = Array.from(branches).filter(b => 
    b.toLowerCase().includes('computer') || 
    b.toLowerCase().includes('engineering')
  );
  computerBranches.forEach(branch => {
    const count = allSnapshot.docs.filter(d => d.data().branch === branch).length;
    console.log(`   - "${branch}": ${count} subjects`);
  });
  
  console.log('\n═══════════════════════════════════════\n');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

