import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  branch: { type: String, required: false },
  semester: { type: Number, required: true },
  credits: { type: Number, default: 4 },
  hours: { type: Number, default: 60 },
  type: { type: String, default: 'Theory' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isCommon: { type: Boolean, default: false },
}, {
  timestamps: true
});

const SubjectModel = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

async function markCommonSubjects() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!mongoUri) {
      console.error('❌ MongoDB URI not configured. Please set MONGODB_URI or DATABASE_URL in backend/.env');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all subjects
    const allSubjects = await SubjectModel.find({}).lean();
    console.log(`📚 Found ${allSubjects.length} total subjects in database`);

    // Group by code and semester to find subjects that appear in multiple branches
    const subjectGroups = {};
    
    allSubjects.forEach(subject => {
      const key = `${subject.code}_${subject.semester}`;
      if (!subjectGroups[key]) {
        subjectGroups[key] = {
          code: subject.code,
          semester: subject.semester,
          name: subject.name,
          subjects: [],
          branches: new Set()
        };
      }
      subjectGroups[key].subjects.push(subject);
      if (subject.branch) {
        subjectGroups[key].branches.add(subject.branch);
      }
    });

    // Find subjects that appear in 2+ branches (should be marked as common)
    const subjectsToMark = [];
    
    Object.values(subjectGroups).forEach(group => {
      if (group.branches.size >= 2) {
        // Subject exists in multiple branches - mark as common
        group.subjects.forEach(subject => {
          if (!subject.isCommon) {
            subjectsToMark.push({
              _id: subject._id,
              code: subject.code,
              name: subject.name,
              semester: subject.semester,
              branch: subject.branch,
              branchCount: group.branches.size
            });
          }
        });
      }
    });

    console.log(`\n📊 Found ${subjectsToMark.length} subjects that should be marked as common`);
    console.log(`   (Subjects appearing in 2+ branches for the same semester)`);

    if (subjectsToMark.length === 0) {
      console.log('\n✅ All potential common subjects are already marked.');
      await mongoose.disconnect();
      return;
    }

    // Group by semester for display
    const bySemester = {};
    subjectsToMark.forEach(subject => {
      if (!bySemester[subject.semester]) {
        bySemester[subject.semester] = [];
      }
      bySemester[subject.semester].push(subject);
    });

    console.log('\n📚 Subjects to mark as common by semester:');
    console.log('='.repeat(80));
    
    Object.keys(bySemester).sort().forEach(sem => {
      const subjects = bySemester[sem];
      const uniqueCodes = new Set(subjects.map(s => s.code));
      console.log(`\nSemester ${sem}: ${subjects.length} subjects (${uniqueCodes.size} unique codes)`);
      
      // Show unique subjects (by code)
      const uniqueSubjects = {};
      subjects.forEach(s => {
        if (!uniqueSubjects[s.code]) {
          uniqueSubjects[s.code] = s;
        }
      });
      
      Object.values(uniqueSubjects).forEach(s => {
        console.log(`  - ${s.name} (${s.code}) - appears in ${s.branchCount} branches`);
      });
    });

    // Update subjects to mark them as common
    console.log('\n\n🔄 Marking subjects as common...');
    let updatedCount = 0;
    let errorCount = 0;

    for (const subject of subjectsToMark) {
      try {
        await SubjectModel.findByIdAndUpdate(
          subject._id,
          { $set: { isCommon: true } },
          { new: true }
        );
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating subject ${subject.code}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Successfully marked ${updatedCount} subjects as common`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} subjects failed to update`);
    }

    // Verify the update
    const commonCount = await SubjectModel.countDocuments({ isCommon: true });
    console.log(`\n📊 Total common subjects in database: ${commonCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

markCommonSubjects();

