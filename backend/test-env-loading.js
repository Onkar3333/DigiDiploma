import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env files
const backendEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

console.log('\n🔍 Testing Environment Variable Loading...\n');
console.log('═══════════════════════════════════════');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
  console.log('✅ Loaded backend/.env');
} else {
  console.log('❌ backend/.env does NOT exist');
}

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: false });
  console.log('✅ Loaded root .env');
} else {
  console.log('⚠️  Root .env does NOT exist');
}

console.log('\n📋 Environment Variables Status:');
console.log('═══════════════════════════════════════');

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;

console.log(`FIREBASE_PROJECT_ID: ${projectId ? '✅ SET (' + projectId + ')' : '❌ NOT SET'}`);
console.log(`FIREBASE_PRIVATE_KEY_ID: ${privateKeyId ? '✅ SET' : '❌ NOT SET'}`);
console.log(`FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅ SET' : '❌ NOT SET'}`);

if (privateKey) {
  const keyLength = privateKey.length;
  const startsWith = privateKey.substring(0, 30);
  const hasBegin = privateKey.includes('BEGIN PRIVATE KEY');
  const hasNewlines = privateKey.includes('\\n') || privateKey.includes('\n');
  const isQuoted = (privateKey.startsWith('"') && privateKey.endsWith('"')) || 
                   (privateKey.startsWith("'") && privateKey.endsWith("'"));
  
  console.log(`FIREBASE_PRIVATE_KEY: ✅ SET`);
  console.log(`   Length: ${keyLength} characters`);
  console.log(`   Starts with: ${startsWith}...`);
  console.log(`   Has BEGIN PRIVATE KEY: ${hasBegin ? '✅ YES' : '❌ NO'}`);
  console.log(`   Has newlines (\\n): ${hasNewlines ? '✅ YES' : '❌ NO'}`);
  console.log(`   Is quoted: ${isQuoted ? '✅ YES' : '❌ NO'}`);
  
  // Check if it needs quotes
  if (!isQuoted && privateKey.includes('\\n')) {
    console.log('\n⚠️  WARNING: Private key contains \\n but is NOT quoted!');
    console.log('   This may cause parsing issues. Wrap it in double quotes in .env file.');
  }
} else {
  console.log(`FIREBASE_PRIVATE_KEY: ❌ NOT SET`);
}

console.log('\n═══════════════════════════════════════\n');

// Test if Firebase would initialize
if (projectId && privateKey && clientEmail) {
  console.log('✅ All required Firebase variables are set!');
  console.log('   Firebase should be able to initialize.');
} else {
  console.log('❌ Missing required Firebase variables:');
  if (!projectId) console.log('   - FIREBASE_PROJECT_ID');
  if (!privateKey) console.log('   - FIREBASE_PRIVATE_KEY');
  if (!clientEmail) console.log('   - FIREBASE_CLIENT_EMAIL');
}

