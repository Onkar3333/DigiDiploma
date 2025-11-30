import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB, isMongoReady } from '../lib/mongodb.js';
import mongoose from 'mongoose';
import FirebaseSubject from '../models/FirebaseSubject.js';
import FirebaseUser from '../models/FirebaseUser.js';
import FirebaseMaterial from '../models/FirebaseMaterial.js';
import FirebaseNotice from '../models/FirebaseNotice.js';
import { db, isFirebaseReady, initializeFirebase } from '../lib/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

// MongoDB Schemas (same as models but for bulk operations)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  studentId: { type: String, sparse: true },
  college: { type: String, default: '' },
  branch: { type: String, default: '' },
  semester: { type: Number, default: null },
  userType: { type: String, enum: ['student', 'admin'], default: 'student' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  fcmToken: { type: String, default: '' },
  fcmTokenUpdatedAt: { type: Date, default: null },
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  branch: { type: String, required: true },
  semester: { type: Number, required: true },
  credits: { type: Number, default: 4 },
  hours: { type: Number, default: 60 },
  type: { type: String, default: 'Theory' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const SubjectModel = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

// Material schema
const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, default: '' },
  description: { type: String, default: '' },
  subjectId: { type: String, required: true },
  subjectName: { type: String, default: '' },
  subjectCode: { type: String, required: true },
  branch: { type: String, default: '' },
  branches: { type: [String], default: [] },
  semester: { type: String, required: true },
  resourceType: { type: String, default: 'notes' },
  accessType: { type: String, default: 'free' },
  price: { type: Number, default: 0 },
  googleDriveUrl: { type: String, default: null },
  storageType: { type: String, default: 'r2' },
  tags: { type: [String], default: [] },
  coverPhoto: { type: String, default: null },
  downloads: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  uploadedBy: { type: String, default: null },
}, { timestamps: true });

// Notice schema
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: 'general' },
  priority: { type: String, default: 'medium' },
  targetAudience: { type: String, default: 'all' },
  targetBranch: { type: String, default: null },
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  attachments: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  createdBy: { type: String, default: null },
}, { timestamps: true });

const MaterialModel = mongoose.models.Material || mongoose.model('Material', materialSchema);
const NoticeModel = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);

// Helper to normalize dates
const normalizeDate = (date) => {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  if (date._seconds) return new Date(date._seconds * 1000);
  return new Date();
};

// Migrate Subjects
async function migrateSubjects() {
  console.log('\n📚 Migrating Subjects...');
  
  if (!isFirebaseReady) {
    console.log('⚠️ Firebase not ready, skipping subjects migration');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  try {
    const firebaseSubjects = await FirebaseSubject.find({});
    console.log(`   Found ${firebaseSubjects.length} subjects in Firebase`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const subject of firebaseSubjects) {
      try {
        // Check if already exists in MongoDB
        const existing = await SubjectModel.findOne({ code: subject.code });
        if (existing) {
          console.log(`   ⏭️  Skipping ${subject.code} - already exists`);
          skipped++;
          continue;
        }

        const mongoSubject = {
          name: subject.name,
          code: subject.code,
          branch: subject.branch,
          semester: subject.semester,
          credits: subject.credits || 4,
          hours: subject.hours || 60,
          type: subject.type || 'Theory',
          description: subject.description || '',
          isActive: subject.isActive !== undefined ? subject.isActive : true,
          createdAt: normalizeDate(subject.createdAt),
          updatedAt: normalizeDate(subject.updatedAt),
        };

        await SubjectModel.create(mongoSubject);
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${firebaseSubjects.length} subjects...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating subject ${subject.code}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Subjects migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    console.error('❌ Error migrating subjects:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Migrate Users
async function migrateUsers() {
  console.log('\n👥 Migrating Users...');
  
  if (!isFirebaseReady) {
    console.log('⚠️ Firebase not ready, skipping users migration');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  try {
    const firebaseUsers = await FirebaseUser.find({});
    console.log(`   Found ${firebaseUsers.length} users in Firebase`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of firebaseUsers) {
      try {
        // Check if already exists in MongoDB
        const existing = await UserModel.findOne({ email: user.email?.toLowerCase() });
        if (existing) {
          console.log(`   ⏭️  Skipping ${user.email} - already exists`);
          skipped++;
          continue;
        }

        const mongoUser = {
          name: user.name,
          email: (user.email || '').toLowerCase(),
          password: user.password, // Keep existing password hash
          studentId: user.studentId || undefined,
          college: user.college || '',
          branch: user.branch || '',
          semester: user.semester || null,
          userType: user.userType || 'student',
          phone: user.phone || '',
          address: user.address || '',
          bio: user.bio || '',
          avatar: user.avatar || '',
          fcmToken: user.fcmToken || '',
          fcmTokenUpdatedAt: user.fcmTokenUpdatedAt ? normalizeDate(user.fcmTokenUpdatedAt) : null,
          createdAt: normalizeDate(user.createdAt),
          updatedAt: normalizeDate(user.updatedAt),
        };

        await UserModel.create(mongoUser);
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${firebaseUsers.length} users...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Users migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Migrate Courses (if they exist in Firebase)
async function migrateCourses() {
  console.log('\n📖 Migrating Courses...');
  
  if (!isFirebaseReady || !db) {
    console.log('⚠️ Firebase not ready, skipping courses migration');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  try {
    // Check if courses collection exists
    const coursesSnapshot = await db.collection('courses').get();
    const courses = [];
    coursesSnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });

    if (courses.length === 0) {
      console.log('   ℹ️  No courses found in Firebase');
      return { migrated: 0, skipped: 0, errors: 0 };
    }

    console.log(`   Found ${courses.length} courses in Firebase`);

    // Create Course schema if needed
    const courseSchema = new mongoose.Schema({
      title: { type: String, required: true },
      description: { type: String, default: '' },
      branch: { type: String, required: true },
      semester: { type: Number, required: true },
      subject: { type: String, default: '' },
      poster: { type: String, default: '' },
      coverPhoto: { type: String, default: '' },
      resourceUrl: { type: String, default: '' },
      isActive: { type: Boolean, default: true },
    }, { timestamps: true });

    const CourseModel = mongoose.models.Course || mongoose.model('Course', courseSchema);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const course of courses) {
      try {
        // Check if already exists (by title + branch + semester)
        const existing = await CourseModel.findOne({
          title: course.title,
          branch: course.branch,
          semester: course.semester
        });
        if (existing) {
          skipped++;
          continue;
        }

        const mongoCourse = {
          title: course.title,
          description: course.description || '',
          branch: course.branch,
          semester: course.semester,
          subject: course.subject || '',
          poster: course.poster || '',
          coverPhoto: course.coverPhoto || '',
          resourceUrl: course.resourceUrl || '',
          isActive: course.isActive !== undefined ? course.isActive : true,
          createdAt: normalizeDate(course.createdAt),
          updatedAt: normalizeDate(course.updatedAt),
        };

        await CourseModel.create(mongoCourse);
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${courses.length} courses...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating course ${course.title}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Courses migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    console.error('❌ Error migrating courses:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Migrate Materials
async function migrateMaterials() {
  console.log('\n📄 Migrating Materials...');
  
  if (!isFirebaseReady) {
    console.log('⚠️ Firebase not ready, skipping materials migration');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  try {
    const firebaseMaterials = await FirebaseMaterial.find({});
    console.log(`   Found ${firebaseMaterials.length} materials in Firebase`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const material of firebaseMaterials) {
      try {
        // Check if already exists in MongoDB (by title + subjectCode + semester)
        const existing = await MaterialModel.findOne({ 
          title: material.title,
          subjectCode: material.subjectCode,
          semester: material.semester
        });
        if (existing) {
          skipped++;
          continue;
        }

        const mongoMaterial = {
          title: material.title,
          type: material.type,
          url: material.url || '',
          description: material.description || '',
          subjectId: material.subjectId,
          subjectName: material.subjectName || '',
          subjectCode: material.subjectCode,
          branch: material.branch || (material.branches && material.branches[0]) || '',
          branches: material.branches || (material.branch ? [material.branch] : []),
          semester: material.semester,
          resourceType: material.resourceType || 'notes',
          accessType: material.accessType || 'free',
          price: material.price || 0,
          googleDriveUrl: material.googleDriveUrl || null,
          storageType: material.storageType || 'r2',
          tags: material.tags || [],
          coverPhoto: material.coverPhoto || null,
          downloads: material.downloads || 0,
          rating: material.rating || 0,
          ratingCount: material.ratingCount || 0,
          uploadedBy: material.uploadedBy || null,
          createdAt: normalizeDate(material.createdAt),
          updatedAt: normalizeDate(material.updatedAt),
        };

        await MaterialModel.create(mongoMaterial);
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${firebaseMaterials.length} materials...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating material ${material.title}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Materials migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    console.error('❌ Error migrating materials:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Migrate Notices
async function migrateNotices() {
  console.log('\n📢 Migrating Notices...');
  
  if (!isFirebaseReady) {
    console.log('⚠️ Firebase not ready, skipping notices migration');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  try {
    const firebaseNotices = await FirebaseNotice.find({});
    console.log(`   Found ${firebaseNotices.length} notices in Firebase`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const notice of firebaseNotices) {
      try {
        // Check if already exists in MongoDB (by title + createdAt)
        const existing = await NoticeModel.findOne({ 
          title: notice.title,
          createdAt: normalizeDate(notice.createdAt)
        });
        if (existing) {
          skipped++;
          continue;
        }

        const mongoNotice = {
          title: notice.title,
          content: notice.content,
          type: notice.type || 'general',
          priority: notice.priority || 'medium',
          targetAudience: notice.targetAudience || 'all',
          targetBranch: notice.targetBranch || null,
          isPinned: notice.isPinned || false,
          isActive: notice.isActive !== undefined ? notice.isActive : true,
          expiresAt: notice.expiresAt ? normalizeDate(notice.expiresAt) : null,
          attachments: notice.attachments || [],
          tags: notice.tags || [],
          createdBy: notice.createdBy || null,
          createdAt: normalizeDate(notice.createdAt),
          updatedAt: normalizeDate(notice.updatedAt),
        };

        await NoticeModel.create(mongoNotice);
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${firebaseNotices.length} notices...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating notice ${notice.title}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Notices migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    console.error('❌ Error migrating notices:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting Firebase to MongoDB Migration\n');
  console.log('=' .repeat(60));

  // Check MongoDB connection
  if (!isMongoReady) {
    console.log('❌ MongoDB not connected. Please check your MONGODB_URI in .env');
    console.log('   Attempting connection...');
    const connected = await connectMongoDB();
    if (!connected) {
      console.log('❌ Failed to connect to MongoDB. Exiting.');
      process.exit(1);
    }
  }

  console.log('✅ MongoDB connected\n');

  // Ensure Firebase is ready
  console.log('🔌 Checking Firebase Admin connection...');
  await initializeFirebase();
  if (!isFirebaseReady || !db) {
    console.log('❌ Firebase is not configured. Please set Firebase service account env vars in backend/.env to migrate data.');
    console.log('   Required env vars: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, etc.');
    console.log('   Skipping migration because Firebase data is unavailable.\n');
    console.log('Tip: If you only have local JSON data, you can manually import it into MongoDB later.');
    await mongoose.connection.close();
    process.exit(1);
  }
  console.log('✅ Firebase connection ready\n');

  // Run migrations
  const results = {
    subjects: { migrated: 0, skipped: 0, errors: 0 },
    users: { migrated: 0, skipped: 0, errors: 0 },
    courses: { migrated: 0, skipped: 0, errors: 0 },
    materials: { migrated: 0, skipped: 0, errors: 0 },
    notices: { migrated: 0, skipped: 0, errors: 0 },
  };

  results.subjects = await migrateSubjects();
  results.users = await migrateUsers();
  results.courses = await migrateCourses();
  results.materials = await migrateMaterials();
  results.notices = await migrateNotices();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`Subjects: ${results.subjects.migrated} migrated, ${results.subjects.skipped} skipped, ${results.subjects.errors} errors`);
  console.log(`Users:    ${results.users.migrated} migrated, ${results.users.skipped} skipped, ${results.users.errors} errors`);
  console.log(`Courses:  ${results.courses.migrated} migrated, ${results.courses.skipped} skipped, ${results.courses.errors} errors`);
  console.log(`Materials: ${results.materials.migrated} migrated, ${results.materials.skipped} skipped, ${results.materials.errors} errors`);
  console.log(`Notices:  ${results.notices.migrated} migrated, ${results.notices.skipped} skipped, ${results.notices.errors} errors`);
  console.log('='.repeat(60));

  const totalMigrated = results.subjects.migrated + results.users.migrated + results.courses.migrated + results.materials.migrated + results.notices.migrated;
  const totalErrors = results.subjects.errors + results.users.errors + results.courses.errors + results.materials.errors + results.notices.errors;

  if (totalErrors === 0) {
    console.log(`\n✅ Migration completed successfully! ${totalMigrated} records migrated.`);
  } else {
    console.log(`\n⚠️  Migration completed with ${totalErrors} errors. Please review the logs above.`);
  }

  await mongoose.connection.close();
  console.log('\n✅ MongoDB connection closed');
  process.exit(0);
}

// Run migration
runMigration().catch(error => {
  console.error('❌ Fatal error during migration:', error);
  process.exit(1);
});

