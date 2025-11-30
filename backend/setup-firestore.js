import { db, isFirebaseReady } from './lib/firebase.js';
import FirebaseSubject from './models/FirebaseSubject.js';

const setupFirestore = async () => {
  console.log('\n🔥 Setting up Firestore Database...\n');
  console.log('═══════════════════════════════════════');
  
  // Wait a bit for Firebase to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`📊 Firebase Ready: ${isFirebaseReady ? '✅ YES' : '❌ NO'}`);
  console.log(`📊 Database Object: ${db ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (!isFirebaseReady || !db) {
    console.log('\n❌ Firebase is NOT initialized!');
    console.log('\n📋 Please check:');
    console.log('1. Your .env file has FIREBASE_PROJECT_ID and FIREBASE_PRIVATE_KEY');
    console.log('2. The private key is properly formatted with \\n characters');
    console.log('3. Restart your backend server after setting up .env');
    return;
  }
  
  try {
    console.log('\n🧪 Testing Firestore connection...');
    
    // Test write
    const testRef = db.collection('_setup_test').doc('connection');
    await testRef.set({
      timestamp: new Date(),
      message: 'Firestore setup test',
      status: 'connected'
    });
    console.log('✅ Write test: SUCCESS');
    
    // Test read
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('✅ Read test: SUCCESS');
      console.log('   Data:', doc.data());
    }
    
    // Clean up
    await testRef.delete();
    console.log('✅ Delete test: SUCCESS');
    
    // Check if subjects collection exists
    console.log('\n📚 Checking subjects collection...');
    const subjectsSnapshot = await db.collection('subjects').get();
    console.log(`📈 Found ${subjectsSnapshot.size} subjects in Firestore`);
    
    if (subjectsSnapshot.size > 0) {
      console.log('\n📋 Sample subjects:');
      let count = 0;
      subjectsSnapshot.forEach(doc => {
        if (count < 3) {
          const subject = doc.data();
          console.log(`   - ${subject.name} (${subject.code}) - ${subject.branch} - Sem ${subject.semester}`);
          count++;
        }
      });
    }
    
    // Test creating a subject
    console.log('\n🧪 Testing subject creation...');
    try {
      const testSubject = await FirebaseSubject.create({
        name: 'Test Subject',
        code: 'TEST999',
        branch: 'Computer Engineering',
        semester: 1,
        credits: 4,
        hours: 60,
        type: 'Theory',
        description: 'Test subject for Firestore setup'
      });
      console.log('✅ Subject creation: SUCCESS');
      console.log(`   Created: ${testSubject.code} - ${testSubject.name}`);
      
      // Clean up test subject
      await db.collection('subjects').doc(testSubject.id).delete();
      console.log('✅ Test subject deleted');
    } catch (createError) {
      console.error('❌ Subject creation failed:', createError.message);
    }
    
    console.log('\n✅ Firestore is fully configured and working!');
    console.log('🎉 You can now use bulk import for subjects!');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Firestore setup failed!');
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\n💡 Permission denied error:');
      console.log('1. Go to Firebase Console → Firestore Database');
      console.log('2. Check Firestore Rules - ensure they allow writes');
      console.log('3. Make sure your service account has proper permissions');
    }
    
    if (error.message.includes('not found')) {
      console.log('\n💡 Database not found:');
      console.log('1. Go to Firebase Console → Firestore Database');
      console.log('2. Click "Create database" if it doesn\'t exist');
      console.log('3. Choose "Start in test mode" or set up proper rules');
    }
  }
};

// Run after a delay to ensure Firebase is initialized
setTimeout(() => {
  setupFirestore();
}, 3000);

