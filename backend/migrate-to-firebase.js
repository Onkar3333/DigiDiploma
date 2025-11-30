import { db, isFirebaseReady } from './lib/firebase.js';
import FirebaseUser from './models/FirebaseUser.js';
import FirebaseSubject from './models/FirebaseSubject.js';
import FirebaseNotice from './models/FirebaseNotice.js';
import FirebaseMaterial from './models/FirebaseMaterial.js';
import FirebaseProject from './models/FirebaseProject.js';

const migrateToFirebase = async () => {
  console.log('🚀 Starting migration to Firebase...\n');
  
  if (!isFirebaseReady) {
    console.log('❌ Firebase is not ready. Please complete the setup first.');
    console.log('📋 Follow the instructions in: firebase-setup-instructions.md');
    return;
  }
  
  try {
    // Migrate Users
    console.log('👥 Migrating users...');
    await migrateUsers();
    
    // Migrate Subjects
    console.log('\n📚 Migrating subjects...');
    await migrateSubjects();
    
    // Migrate Notices
    console.log('\n📢 Migrating notices...');
    await migrateNotices();
    
    // Migrate Materials
    console.log('\n📄 Migrating materials...');
    await migrateMaterials();
    
    // Migrate Projects
    console.log('\n🎯 Migrating projects...');
    await migrateProjects();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('🌐 All data is now stored in Firebase.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
};

const migrateUsers = async () => {
  try {
    const { default: jsonDb } = await import('./lib/jsonDatabase.js');
    const users = await jsonDb.readUsers();
    
    console.log(`📥 Found ${users.length} users to migrate`);
    
    for (const user of users) {
      try {
        // Check if user already exists
        const existingUser = await FirebaseUser.findOne({ email: user.email });
        if (existingUser) {
          console.log(`   ⏭️  Skipping existing user: ${user.name}`);
          continue;
        }
        
        // Create user in Firebase
        const userRef = db.collection('users').doc();
        const firebaseUser = {
          id: userRef.id,
          name: user.name,
          email: user.email,
          password: user.password,
          college: user.college,
          studentId: user.studentId,
          branch: user.branch,
          semester: user.semester,
          userType: user.userType,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: new Date()
        };
        
        await userRef.set(firebaseUser);
        console.log(`   ✅ Migrated: ${user.name} (${user.email})`);
      } catch (error) {
        console.log(`   ❌ Failed to migrate: ${user.name} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error migrating users:', error.message);
  }
};

const migrateSubjects = async () => {
  try {
    const { default: jsonDb } = await import('./lib/jsonDatabase.js');
    const subjects = await jsonDb.readSubjects();
    
    console.log(`📥 Found ${subjects.length} subjects to migrate`);
    
    for (const subject of subjects) {
      try {
        const subjectRef = db.collection('subjects').doc();
        const firebaseSubject = {
          id: subjectRef.id,
          ...subject,
          createdAt: subject.createdAt ? new Date(subject.createdAt) : new Date(),
          updatedAt: new Date()
        };
        
        await subjectRef.set(firebaseSubject);
        console.log(`   ✅ Migrated: ${subject.name}`);
      } catch (error) {
        console.log(`   ❌ Failed to migrate: ${subject.name} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error migrating subjects:', error.message);
  }
};

const migrateNotices = async () => {
  try {
    const { default: jsonDb } = await import('./lib/jsonDatabase.js');
    const notices = await jsonDb.readNotices();
    
    console.log(`📥 Found ${notices.length} notices to migrate`);
    
    for (const notice of notices) {
      try {
        const noticeRef = db.collection('notices').doc();
        const firebaseNotice = {
          id: noticeRef.id,
          ...notice,
          createdAt: notice.createdAt ? new Date(notice.createdAt) : new Date(),
          updatedAt: new Date()
        };
        
        await noticeRef.set(firebaseNotice);
        console.log(`   ✅ Migrated: ${notice.title}`);
      } catch (error) {
        console.log(`   ❌ Failed to migrate: ${notice.title} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error migrating notices:', error.message);
  }
};

const migrateMaterials = async () => {
  try {
    const { default: jsonDb } = await import('./lib/jsonDatabase.js');
    const materials = await jsonDb.readMaterials();
    
    console.log(`📥 Found ${materials.length} materials to migrate`);
    
    for (const material of materials) {
      try {
        const materialRef = db.collection('materials').doc();
        const firebaseMaterial = {
          id: materialRef.id,
          ...material,
          createdAt: material.createdAt ? new Date(material.createdAt) : new Date(),
          updatedAt: new Date()
        };
        
        await materialRef.set(firebaseMaterial);
        console.log(`   ✅ Migrated: ${material.title}`);
      } catch (error) {
        console.log(`   ❌ Failed to migrate: ${material.title} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error migrating materials:', error.message);
  }
};

const migrateProjects = async () => {
  try {
    const { default: jsonDb } = await import('./lib/jsonDatabase.js');
    const projects = await jsonDb.readProjects();
    
    console.log(`📥 Found ${projects.length} projects to migrate`);
    
    for (const project of projects) {
      try {
        const projectRef = db.collection('projects').doc();
        const firebaseProject = {
          id: projectRef.id,
          ...project,
          createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
          updatedAt: new Date()
        };
        
        await projectRef.set(firebaseProject);
        console.log(`   ✅ Migrated: ${project.title}`);
      } catch (error) {
        console.log(`   ❌ Failed to migrate: ${project.title} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error migrating projects:', error.message);
  }
};

// Run the migration
migrateToFirebase();