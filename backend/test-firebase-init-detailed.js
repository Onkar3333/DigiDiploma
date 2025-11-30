import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env files
const backendEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: false });
}

console.log('\n🔥 Testing Firebase Admin SDK Initialization...\n');
console.log('═══════════════════════════════════════');

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
const clientId = process.env.FIREBASE_CLIENT_ID;
const clientCertUrl = process.env.FIREBASE_CLIENT_CERT_URL;

if (!projectId || !privateKey || !clientEmail) {
  console.log('❌ Missing required environment variables');
  process.exit(1);
}

console.log('📋 Environment Variables:');
console.log(`   PROJECT_ID: ${projectId}`);
console.log(`   CLIENT_EMAIL: ${clientEmail}`);
console.log(`   PRIVATE_KEY length: ${privateKey.length}`);
console.log(`   PRIVATE_KEY starts with: ${privateKey.substring(0, 30)}...`);

// Clean up the private key
let cleanedKey = privateKey;
if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
  cleanedKey = cleanedKey.slice(1, -1); // Remove quotes
  console.log('   ✅ Removed quotes from private key');
}
cleanedKey = cleanedKey.replace(/\\n/g, '\n');
console.log(`   ✅ Converted \\n to actual newlines`);

if (!cleanedKey.includes('BEGIN PRIVATE KEY')) {
  console.log('❌ Invalid private key format - missing BEGIN PRIVATE KEY');
  process.exit(1);
}

console.log('\n🔧 Creating service account object...');
const serviceAccount = {
  type: "service_account",
  project_id: projectId,
  private_key_id: privateKeyId,
  private_key: cleanedKey,
  client_email: clientEmail,
  client_id: clientId,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: clientCertUrl
};

console.log('✅ Service account object created');

console.log('\n🚀 Initializing Firebase Admin SDK...');
try {
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId
  });
  
  console.log('✅ Firebase Admin app initialized');
  
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  
  // Test connection
  console.log('\n🧪 Testing Firestore connection...');
  try {
    const testRef = db.collection('_test').doc('init');
    await testRef.get();
    console.log('✅ Firestore connection test: SUCCESS');
    console.log('\n🎉 Firebase is fully configured and working!');
  } catch (testError) {
    console.log('⚠️  Firestore connection test failed:');
    console.log(`   Error: ${testError.message}`);
    console.log(`   Code: ${testError.code}`);
    
    if (testError.code === 'PERMISSION_DENIED') {
      console.log('\n💡 This might be a permissions issue.');
      console.log('   Check Firestore Rules in Firebase Console.');
    } else if (testError.code === 'NOT_FOUND') {
      console.log('\n💡 Firestore database might not exist.');
      console.log('   Go to Firebase Console and create the database.');
    } else {
      console.log('\n💡 Firebase Admin SDK initialized, but connection test failed.');
      console.log('   This might still work for your use case.');
    }
  }
  
} catch (initError) {
  console.log('❌ Firebase initialization failed:');
  console.log(`   Error: ${initError.message}`);
  console.log(`   Code: ${initError.code || 'N/A'}`);
  console.log(`   Stack: ${initError.stack}`);
  
  if (initError.message.includes('private key')) {
    console.log('\n💡 Private key format issue detected.');
    console.log('   Make sure FIREBASE_PRIVATE_KEY is properly formatted in .env');
  }
  
  process.exit(1);
}

