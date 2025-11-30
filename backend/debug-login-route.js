import bcrypt from 'bcryptjs';
import { isFirebaseReady } from './lib/firebase.js';

const debugLoginRoute = async () => {
  const emailOrStudentId = "admin@eduportal.com";
  const password = "admin123";
  
  console.log('=== DEBUG LOGIN ROUTE ===');
  console.log('Email/StudentID:', emailOrStudentId);
  console.log('Password:', password);
  console.log('isFirebaseReady:', isFirebaseReady);
  
  // Simulate the login logic
  let user = null;
  
  // Try Firebase first if available
  if (isFirebaseReady) {
    console.log('Trying Firebase...');
    try {
      // This would be the Firebase user lookup
      console.log('Firebase user lookup would happen here');
    } catch (e) {
      console.error('Firebase user lookup error:', e);
      user = null;
    }
  } else {
    console.log('Firebase not ready, skipping Firebase lookup');
  }
  
  // JSON fallback removed; everything is Firebase-only now
  if (!user) {
    console.log('No user found. Ensure Firebase is configured and user exists.');
  }
};

debugLoginRoute();
