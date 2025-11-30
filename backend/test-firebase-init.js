import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

console.log('🔍 Checking .env files...');
console.log(`Backend .env: ${backendEnvPath} - ${fs.existsSync(backendEnvPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
console.log(`Root .env: ${rootEnvPath} - ${fs.existsSync(rootEnvPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
  console.log('✅ Loaded backend/.env');
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  console.log('✅ Loaded root .env');
}

console.log('\n📋 Checking Firebase environment variables:');
console.log(`FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? '✅ SET (' + process.env.FIREBASE_PRIVATE_KEY.substring(0, 50) + '...)' : '❌ MISSING'}`);
console.log(`FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? '✅ SET' : '❌ MISSING'}`);
console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ SET' : '❌ NOT SET'}`);

// Now test Firebase initialization
console.log('\n🧪 Testing Firebase initialization...');
import('./lib/firebase.js').then(async (firebase) => {
  console.log(`\n📊 Firebase Status:`);
  console.log(`isFirebaseReady: ${firebase.isFirebaseReady ? '✅ YES' : '❌ NO'}`);
  console.log(`db: ${firebase.db ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (firebase.isFirebaseReady && firebase.db) {
    try {
      console.log('\n🧪 Testing Firestore connection...');
      const testRef = firebase.db.collection('_test').doc('connection');
      await testRef.set({ timestamp: new Date(), status: 'connected' });
      console.log('✅ Write test: SUCCESS');
      
      const doc = await testRef.get();
      if (doc.exists) {
        console.log('✅ Read test: SUCCESS');
      }
      
      await testRef.delete();
      console.log('✅ Delete test: SUCCESS');
      console.log('\n🎉 Firebase is fully working!');
    } catch (error) {
      console.error('❌ Firestore test failed:', error.message);
    }
  } else {
    console.log('\n❌ Firebase is NOT initialized');
    console.log('\n💡 Troubleshooting:');
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.log('  - FIREBASE_PROJECT_ID is missing from .env');
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.log('  - FIREBASE_PRIVATE_KEY is missing from .env');
    }
    if (process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')) {
      console.log('  - FIREBASE_PRIVATE_KEY format might be incorrect');
    }
  }
}).catch(err => {
  console.error('❌ Error importing firebase:', err.message);
});

