import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load backend/.env before reading env vars (important when this file is imported first)
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // firebase.js is in backend/lib/, so go up one level to backend/, then to .env
  const backendEnvPath = path.join(__dirname, '..', '.env'); // backend/.env
  const rootEnvPath = path.join(__dirname, '..', '..', '.env'); // root .env
  
  // Load backend/.env first (with override), then root .env (but don't override backend vars)
  // Clear any existing env vars first to ensure clean loading
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath, override: true });
    console.log('✅ Loaded .env from backend directory');
  }
  // Load root .env but don't override backend vars (backend takes priority)
  if (fs.existsSync(rootEnvPath)) {
    // Only load root .env if backend .env doesn't exist, or load it without overriding
    if (!fs.existsSync(backendEnvPath)) {
      dotenv.config({ path: rootEnvPath, override: true });
      console.log('✅ Loaded .env from root directory (backend .env not found)');
    } else {
      // Backend .env exists, so load root .env but don't override existing vars
      dotenv.config({ path: rootEnvPath, override: false });
      console.log('✅ Loaded .env from root directory (non-override mode)');
    }
  }
} catch (err) {
  console.error('Error loading .env:', err.message);
}

// Initialize Firebase Admin SDK
let adminApp;
let db;
let isFirebaseReady = false;

const isQuotaError = (error) => {
  if (!error) return false;
  return error.code === 8 || (error.details && error.details.includes('Quota exceeded')) || (error.message && error.message.includes('Quota exceeded'));
};

export async function initializeFirebase() {
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length === 0) {
      // Try to initialize with service account if available
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        try {
          // Clean up the private key - handle both \n and actual newlines
          let privateKey = process.env.FIREBASE_PRIVATE_KEY;
          if (privateKey) {
            privateKey = privateKey.replace(/\\n/g, '\n');
            // Ensure it starts and ends correctly
            if (!privateKey.includes('BEGIN PRIVATE KEY')) {
              console.error('❌ Invalid private key format');
              throw new Error('Invalid private key format');
            }
          }
          
          const serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: privateKey,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
          };

          adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID
          });

          db = admin.firestore();
          
          // Test the connection - just try to access Firestore
          try {
            // Simple test - just check if we can access the database
            const testRef = db.collection('_test').doc('init');
            await testRef.get(); // This will succeed even if doc doesn't exist
            isFirebaseReady = true;
            console.log('✅ Firebase Admin initialized with service account');
          } catch (testError) {
            if (isQuotaError(testError)) {
              console.warn('⚠️ Firebase connection test hit quota limits, but db exists. Continuing with cached/local fallbacks.');
              isFirebaseReady = true;
            } else if (db) {
              console.log('⚠️ Firebase connection test failed, but db exists. Marking as ready.');
              console.log('   Error:', testError.message);
              isFirebaseReady = true; // Still mark as ready - the test might fail due to permissions
            } else {
              console.error('❌ Firebase connection test failed:', testError.message);
              isFirebaseReady = false;
            }
          }
        } catch (initError) {
          console.error('❌ Error initializing Firebase with service account:', initError.message);
          isFirebaseReady = false;
        }
      } else {
        // Try Application Default Credentials ONLY if explicitly configured and file exists
        const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (adcPath && fs.existsSync(adcPath)) {
          try {
            adminApp = admin.initializeApp({
              credential: admin.credential.applicationDefault(),
              projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId
            });
            db = admin.firestore();
            
            // Test Firebase connectivity
            try {
              await db.collection('_conn_test').doc('_ping').get();
              isFirebaseReady = true;
              console.log('✅ Firebase Admin initialized (ADC)');
            } catch (testError) {
              if (isQuotaError(testError)) {
                console.warn('⚠️ Firebase ADC connectivity hit quota limits. Continuing with fallback strategies.');
                isFirebaseReady = true;
              } else {
                isFirebaseReady = false;
                console.log('❌ Firebase ADC connectivity failed; falling back to local store');
              }
            }
          } catch {
            isFirebaseReady = false;
            console.log('❌ Firebase ADC init failed; falling back to local store');
          }
        } else {
          isFirebaseReady = false;
          console.log('⚠️ Firebase service account not configured; using local JSON store');
          console.log('💡 To enable Firebase, set FIREBASE_PROJECT_ID and FIREBASE_PRIVATE_KEY in .env');
        }
      }
    } else {
      adminApp = admin.app();
      db = admin.firestore();
      isFirebaseReady = true;
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    console.log('Falling back to JSON database for now...');
    isFirebaseReady = false;
  }
}

// Initialize Firebase Client SDK (for frontend-like usage on server if needed)
const clientFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId
};

let clientApp;
let clientDb;

try {
  clientApp = initializeApp(clientFirebaseConfig);
  clientDb = getFirestore(clientApp);
  console.log('Firebase Client initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Client:', error);
}

export { admin, db, clientApp, clientDb };
export { isFirebaseReady };
export default { admin, db, clientApp, clientDb, isFirebaseReady, initializeFirebase };
