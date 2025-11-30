import { db, isFirebaseReady } from './lib/firebase.js';
import FirebaseUser from './models/FirebaseUser.js';

const setupFirebase = async () => {
  console.log('🔥 Setting up Firebase for your college management system...\n');
  
  if (!isFirebaseReady) {
    console.log('❌ Firebase is not ready. Please check your configuration.');
    console.log('\n📋 To fix this, you need to:');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
    console.log('2. Select your project: college-management-syste-7e0de');
    console.log('3. Go to Project Settings > Service Accounts');
    console.log('4. Generate a new private key');
    console.log('5. Set the environment variables or use Firebase CLI');
    console.log('\n🚀 Alternative: Use Firebase CLI authentication:');
    console.log('   npm install -g firebase-tools');
    console.log('   firebase login');
    console.log('   firebase use college-management-syste-7e0de');
    return;
  }

  try {
    console.log('✅ Firebase is ready!');
    console.log('📊 Testing Firebase connection...');
    
    // Test basic connection
    const testRef = db.collection('_test').doc('connection');
    await testRef.set({ timestamp: new Date(), status: 'connected' });
    console.log('✅ Firebase connection successful!');
    
    // Clean up test document
    await testRef.delete();
    
    // Check if users collection exists and has data
    console.log('\n👥 Checking users collection...');
    const usersSnapshot = await db.collection('users').get();
    console.log(`📈 Found ${usersSnapshot.size} users in Firebase`);
    
    if (usersSnapshot.size === 0) {
      console.log('\nℹ️ No users found in Firebase. Create an admin via scripts/create-admin.js');
    } else {
      console.log('✅ Users already exist in Firebase!');
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`   - ${user.name} (${user.email}) - ${user.userType}`);
      });
    }
    
    console.log('\n🎉 Firebase setup complete!');
    console.log('🌐 Your website is now using Firebase as the primary database.');
    
  } catch (error) {
    console.error('❌ Error setting up Firebase:', error.message);
    console.log('\n💡 This might be due to:');
    console.log('1. Missing Firebase service account credentials');
    console.log('2. Network connectivity issues');
    console.log('3. Firebase project permissions');
  }
};

// JSON migration removed; use admin script to seed users

// Run the setup
setupFirebase();
