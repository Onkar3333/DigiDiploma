// Firebase client initialization for the frontend
// Uses the web config you provided to enable Auth, Firestore and Storage

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyA_C_f9lTX4FLhm1DaxLc6VLErcC8m3jgA',
  authDomain: 'college-management-syste-7e0de.firebaseapp.com',
  projectId: 'college-management-syste-7e0de',
  storageBucket: 'college-management-syste-7e0de.firebasestorage.app',
  messagingSenderId: '171436599480',
  appId: '1:171436599480:web:b37379c1c7b82777d9ec4d',
  measurementId: 'G-LRZ4SJWQG0',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Initialize only once in the browser
app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

export { app, auth, db, storage };


