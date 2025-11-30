import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB, isMongoReady } from '../lib/mongodb.js';
import mongoose from 'mongoose';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

// MongoDB Schemas
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

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const NoticeModel = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);
const MaterialModel = mongoose.models.Material || mongoose.model('Material', materialSchema);

// Helper to normalize dates
const normalizeDate = (date) => {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  if (date._seconds) return new Date(date._seconds * 1000);
  if (date.toDate) return date.toDate();
  return new Date();
};

// Migrate Users from JSON
async function migrateUsersFromJSON() {
  console.log('\n👥 Migrating Users from JSON...');
  
  const jsonPath = path.join(__dirname, '..', 'database', 'users.json');
  
  try {
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const users = JSON.parse(fileContent);
    
    // Handle both array and object formats
    const usersArray = Array.isArray(users) ? users : Object.values(users);
    
    console.log(`   Found ${usersArray.length} users in JSON file`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of usersArray) {
      try {
        // Check if already exists in MongoDB
        const existing = await UserModel.findOne({ email: (user.email || '').toLowerCase() });
        if (existing) {
          skipped++;
          continue;
        }

        // Handle semester - convert to number or null
        let semester = null;
        if (user.semester) {
          if (typeof user.semester === 'number') {
            semester = user.semester;
          } else if (typeof user.semester === 'string') {
            const parsed = parseInt(user.semester, 10);
            semester = isNaN(parsed) ? null : parsed;
          }
        }

        const mongoUser = {
          name: user.name,
          email: (user.email || '').toLowerCase(),
          password: user.password, // Keep existing password hash
          studentId: user.studentId || undefined,
          college: user.college || '',
          branch: user.branch || '',
          semester: semester,
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
          console.log(`   ✅ Migrated ${migrated}/${usersArray.length} users...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Users migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('   ℹ️  No users.json file found, skipping users migration');
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    console.error('❌ Error migrating users:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Migrate Notices from JSON
async function migrateNoticesFromJSON() {
  console.log('\n📢 Migrating Notices from JSON...');
  
  const jsonPath = path.join(__dirname, '..', 'database', 'notices.json');
  
  try {
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const notices = JSON.parse(fileContent);
    
    // Handle both array and object formats
    const noticesArray = Array.isArray(notices) ? notices : Object.values(notices);
    
    console.log(`   Found ${noticesArray.length} notices in JSON file`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const notice of noticesArray) {
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
          console.log(`   ✅ Migrated ${migrated}/${noticesArray.length} notices...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating notice ${notice.title}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Notices migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('   ℹ️  No notices.json file found, skipping notices migration');
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    console.error('❌ Error migrating notices:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Migrate Materials from JSON (if materials.json exists)
async function migrateMaterialsFromJSON() {
  console.log('\n📄 Migrating Materials from JSON...');
  
  const jsonPath = path.join(__dirname, '..', 'database', 'materials.json');
  
  try {
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const materials = JSON.parse(fileContent);
    
    // Handle both array and object formats
    const materialsArray = Array.isArray(materials) ? materials : Object.values(materials);
    
    console.log(`   Found ${materialsArray.length} materials in JSON file`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const material of materialsArray) {
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

        const branches = material.branches || (material.branch ? [material.branch] : []);
        const branch = material.branch || (branches.length > 0 ? branches[0] : '');
        const storageType = material.storageType || 
                           (material.url?.includes('r2.cloudflarestorage.com') || 
                            material.url?.includes('/api/materials/proxy/r2/') 
                            ? 'r2' : 'local');

        const mongoMaterial = {
          title: material.title,
          type: material.type,
          url: material.url || '',
          description: material.description || '',
          subjectId: material.subjectId,
          subjectName: material.subjectName || '',
          subjectCode: material.subjectCode,
          branch: branch,
          branches: branches,
          semester: material.semester,
          resourceType: material.resourceType || 'notes',
          accessType: material.accessType || 'free',
          price: material.price || 0,
          googleDriveUrl: material.googleDriveUrl || null,
          storageType: storageType,
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
          console.log(`   ✅ Migrated ${migrated}/${materialsArray.length} materials...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating material ${material.title}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ Materials migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('   ℹ️  No materials.json file found, skipping materials migration');
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    console.error('❌ Error migrating materials:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting JSON to MongoDB Migration\n');
  console.log('='.repeat(60));

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

  // Run migrations
  const results = {
    users: { migrated: 0, skipped: 0, errors: 0 },
    notices: { migrated: 0, skipped: 0, errors: 0 },
    materials: { migrated: 0, skipped: 0, errors: 0 },
  };

  results.users = await migrateUsersFromJSON();
  results.notices = await migrateNoticesFromJSON();
  results.materials = await migrateMaterialsFromJSON();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`Users:    ${results.users.migrated} migrated, ${results.users.skipped} skipped, ${results.users.errors} errors`);
  console.log(`Notices:  ${results.notices.migrated} migrated, ${results.notices.skipped} skipped, ${results.notices.errors} errors`);
  console.log(`Materials: ${results.materials.migrated} migrated, ${results.materials.skipped} skipped, ${results.materials.errors} errors`);
  console.log('='.repeat(60));

  const totalMigrated = results.users.migrated + results.notices.migrated + results.materials.migrated;
  const totalErrors = results.users.errors + results.notices.errors + results.materials.errors;

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

