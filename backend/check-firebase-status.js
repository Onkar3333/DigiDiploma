import { db, isFirebaseReady } from './lib/firebase.js';
import FirebaseSubject from './models/FirebaseSubject.js';

const checkFirebaseStatus = async () => {
  // Wait for Firebase to initialize (it's async)
  console.log('⏳ Waiting for Firebase to initialize...');
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (isFirebaseReady && db) break;
  }
  
  console.log('\n🔍 Checking Firebase Status...\n');
  console.log('═══════════════════════════════════════');
  
  // Check if Firebase is ready
  console.log(`📊 Firebase Ready: ${isFirebaseReady ? '✅ YES' : '❌ NO'}`);
  console.log(`📊 Database Object: ${db ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (!isFirebaseReady || !db) {
    console.log('\n❌ Firebase is NOT initialized!');
    console.log('\n📋 To fix this:');
    console.log('1. Create backend/.env file');
    console.log('2. Add Firebase configuration (see backend/QUICK_FIREBASE_SETUP.md)');
    console.log('3. Restart your backend server');
    return;
  }
  
  try {
    // Test connection
    console.log('\n🧪 Testing Firebase Connection...');
    const testRef = db.collection('_test').doc('status-check');
    await testRef.set({ 
      timestamp: new Date(),
      status: 'connected'
    });
    console.log('✅ Write test: SUCCESS');
    
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('✅ Read test: SUCCESS');
    }
    
    await testRef.delete();
    console.log('✅ Delete test: SUCCESS');
    
    // Check subjects collection
    console.log('\n📚 Checking Subjects Collection...');
    const subjectsSnapshot = await db.collection('subjects').get();
    console.log(`📈 Total subjects in Firebase: ${subjectsSnapshot.size}`);
    
    if (subjectsSnapshot.size > 0) {
      console.log('\n📋 Sample subjects:');
      let count = 0;
      subjectsSnapshot.forEach(doc => {
        if (count < 5) {
          const subject = doc.data();
          console.log(`   - ${subject.name} (${subject.code}) - ${subject.branch} - Sem ${subject.semester}`);
          count++;
        }
      });
    }
    
    // Test FirebaseSubject model
    console.log('\n🧪 Testing FirebaseSubject Model...');
    try {
      const testSubjects = await FirebaseSubject.find({});
      console.log(`✅ FirebaseSubject.find() works: Found ${testSubjects.length} subjects`);
    } catch (error) {
      console.log(`❌ FirebaseSubject.find() failed: ${error.message}`);
    }
    
    console.log('\n✅ Firebase is properly configured and working!');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Firebase connection test failed!');
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.log('\n💡 Check your Firebase configuration in backend/.env');
  }
};

checkFirebaseStatus();

