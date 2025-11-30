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

console.log('\n📚 Checking Subjects in Firebase...\n');
console.log('═══════════════════════════════════════');

if (!isFirebaseReady || !db) {
  console.log('❌ Firebase is not ready');
  process.exit(1);
}

try {
  const snapshot = await db.collection('subjects').get();
  console.log(`📊 Total subjects in Firebase: ${snapshot.size}\n`);
  
  if (snapshot.size > 0) {
    // Group by branch
    const byBranch = {};
    snapshot.forEach(doc => {
      const subject = doc.data();
      const branch = subject.branch || 'Unknown';
      if (!byBranch[branch]) {
        byBranch[branch] = [];
      }
      byBranch[branch].push(subject);
    });
    
    console.log('📋 Subjects by Branch:');
    Object.keys(byBranch).sort().forEach(branch => {
      console.log(`   ${branch}: ${byBranch[branch].length} subjects`);
    });
    
    console.log('\n📋 Sample subjects (first 10):');
    let count = 0;
    snapshot.forEach(doc => {
      if (count < 10) {
        const subject = doc.data();
        console.log(`   ${subject.code} - ${subject.name} (${subject.branch}, Sem ${subject.semester})`);
        count++;
      }
    });
  } else {
    console.log('📭 No subjects found in Firebase');
    console.log('   Ready to import!');
  }
  
  console.log('\n═══════════════════════════════════════\n');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

