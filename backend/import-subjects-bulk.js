import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import FirebaseSubject from './models/FirebaseSubject.js';
import { db, isFirebaseReady } from './lib/firebase.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: false });
}

// Wait for Firebase to initialize
await new Promise(resolve => setTimeout(resolve, 3000));

const importSubjects = async (subjectsData) => {
  console.log('\n📚 Starting Bulk Subject Import...\n');
  console.log('═══════════════════════════════════════');
  
  // Check Firebase status
  console.log(`📊 Firebase Ready: ${isFirebaseReady ? '✅ YES' : '❌ NO'}`);
  console.log(`📊 Database: ${db ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (!isFirebaseReady || !db) {
    console.log('\n❌ Firebase is not initialized!');
    console.log('💡 Trying to import anyway (Firebase might still work)...\n');
  }
  
  if (!Array.isArray(subjectsData) || subjectsData.length === 0) {
    console.error('❌ Invalid data: Must be a non-empty array');
    return;
  }
  
  console.log(`📥 Importing ${subjectsData.length} subjects...\n`);
  
  const results = [];
  const errors = [];
  const AVAILABLE_BRANCHES = [
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
  
  for (let i = 0; i < subjectsData.length; i++) {
    const subjectData = subjectsData[i];
    const { name, code, branch, semester, credits, hours, type, description } = subjectData;
    
    try {
      // Validate required fields
      if (!name || !code || !branch || semester === undefined || semester === null) {
        errors.push({
          index: i + 1,
          code: code || 'N/A',
          name: name || 'N/A',
          error: 'Missing required fields: name, code, branch, and semester are required'
        });
        continue;
      }
      
      // Validate branch
      if (!AVAILABLE_BRANCHES.includes(branch)) {
        errors.push({
          index: i + 1,
          code,
          name,
          error: `Invalid branch: ${branch}. Must be one of: ${AVAILABLE_BRANCHES.join(', ')}`
        });
        continue;
      }
      
      // Validate semester
      const semesterNum = parseInt(semester);
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 6) {
        errors.push({
          index: i + 1,
          code,
          name,
          error: `Invalid semester: ${semester}. Must be a number between 1 and 6`
        });
        continue;
      }
      
      // Check if subject already exists (check by both code AND branch)
      try {
        // Use find without ordering to avoid index requirement
        // Check for duplicate by both code and branch (same code can exist in different branches)
        const existing = await FirebaseSubject.find({ 
          code: code.trim().toUpperCase(),
          branch: branch.trim()
        }, { orderBy: false });
        if (existing && existing.length > 0) {
          errors.push({
            index: i + 1,
            code,
            name,
            error: `Subject code ${code} already exists for branch ${branch}`
          });
          continue;
        }
      } catch (findError) {
        // If find fails, skip duplicate check and continue (not critical)
        console.log(`  ⚠️  Skipping duplicate check for ${code}, continuing...`);
      }
      
      // Create the subject
      try {
        console.log(`  [${i + 1}/${subjectsData.length}] Creating: ${code} - ${name}`);
        const created = await FirebaseSubject.create({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          branch: branch.trim(),
          semester: semesterNum,
          credits: credits ? parseInt(credits) : 4,
          hours: hours ? parseInt(hours) : 60,
          type: type || 'Theory',
          description: description ? description.trim() : '',
          isActive: true // All imported subjects are active by default
        });
        
        results.push({
          code: created.code || created.id,
          name: created.name,
          branch: created.branch,
          semester: created.semester
        });
        console.log(`     ✅ Created successfully`);
      } catch (createError) {
        console.error(`     ❌ Failed: ${createError.message}`);
        errors.push({
          index: i + 1,
          code,
          name,
          error: createError.message || 'Failed to create subject'
        });
      }
    } catch (error) {
      console.error(`  ❌ Error processing subject ${i + 1}:`, error.message);
      errors.push({
        index: i + 1,
        code: subjectData.code || 'N/A',
        name: subjectData.name || 'N/A',
        error: error.message || 'Unknown error'
      });
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 Import Summary:');
  console.log(`   ✅ Successfully imported: ${results.length}`);
  console.log(`   ❌ Failed: ${errors.length}`);
  console.log(`   📦 Total: ${subjectsData.length}`);
  
  if (results.length > 0) {
    console.log('\n✅ Successfully imported subjects:');
    results.slice(0, 10).forEach(r => {
      console.log(`   - ${r.code}: ${r.name} (${r.branch}, Sem ${r.semester})`);
    });
    if (results.length > 10) {
      console.log(`   ... and ${results.length - 10} more`);
    }
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Failed subjects:');
    errors.slice(0, 10).forEach(e => {
      console.log(`   [${e.index}] ${e.code}: ${e.error}`);
    });
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`);
    }
  }
  
  console.log('\n═══════════════════════════════════════\n');
  
  return { results, errors };
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📚 Bulk Subject Import Script\n');
    console.log('Usage:');
    console.log('  node import-subjects-bulk.js <path-to-json-file>');
    console.log('  node import-subjects-bulk.js --stdin  (read from stdin)');
    console.log('\nExample:');
    console.log('  node import-subjects-bulk.js subjects.json');
    console.log('  cat subjects.json | node import-subjects-bulk.js --stdin');
    process.exit(1);
  }
  
  let subjectsData;
  
  if (args[0] === '--stdin') {
    // Read from stdin
    let input = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    try {
      subjectsData = JSON.parse(input);
    } catch (error) {
      console.error('❌ Invalid JSON from stdin:', error.message);
      process.exit(1);
    }
  } else {
    // Read from file
    const filePath = args[0];
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exit(1);
    }
    
    try {
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      subjectsData = JSON.parse(fileContent);
    } catch (error) {
      console.error(`❌ Error reading file: ${error.message}`);
      process.exit(1);
    }
  }
  
  if (!Array.isArray(subjectsData)) {
    console.error('❌ Invalid format: Data must be a JSON array');
    process.exit(1);
  }
  
  await importSubjects(subjectsData);
  
  // Exit with appropriate code
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

