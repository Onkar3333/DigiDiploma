import { db, isFirebaseReady } from './lib/firebase.js';

const testFirebaseConnection = async () => {
  console.log('🧪 Testing Firebase Connection...\n');
  
  console.log('📊 Firebase Status:', isFirebaseReady ? '✅ Ready' : '❌ Not Ready');
  
  if (!isFirebaseReady) {
    console.log('\n❌ Firebase is not ready. Please complete the setup first.');
    console.log('📋 Follow the instructions in: firebase-setup-instructions.md');
    return;
  }
  
  try {
    console.log('🔗 Testing database connection...');
    
    // Test write operation
    const testRef = db.collection('_test').doc('connection-test');
    await testRef.set({
      timestamp: new Date(),
      message: 'Firebase connection test successful!',
      status: 'connected'
    });
    console.log('✅ Write test successful');
    
    // Test read operation
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('✅ Read test successful');
      console.log('📄 Test data:', doc.data());
    }
    
    // Clean up test document
    await testRef.delete();
    console.log('✅ Cleanup successful');
    
    // Test users collection
    console.log('\n👥 Testing users collection...');
    const usersSnapshot = await db.collection('users').get();
    console.log(`📈 Found ${usersSnapshot.size} users in Firebase`);
    
    if (usersSnapshot.size > 0) {
      console.log('👤 Users in Firebase:');
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`   - ${user.name} (${user.email}) - ${user.userType}`);
      });
    }
    
    console.log('\n🎉 Firebase connection test completed successfully!');
    console.log('🌐 Your website is now using Firebase as the primary database.');
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('1. Complete Firebase authentication: firebase login');
    console.log('2. Set your project: firebase use college-management-syste-7e0de');
    console.log('3. Set application default credentials: gcloud auth application-default login');
    console.log('4. Check your internet connection');
  }
};

testFirebaseConnection();
