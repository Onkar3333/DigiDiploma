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

async function findCommonSubjects() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!mongoUri) {
      console.error('❌ MongoDB URI not configured. Please set MONGODB_URI or DATABASE_URL in backend/.env');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all subjects grouped by code and semester
    const allSubjects = await SubjectModel.find({}).lean();
    console.log(`📚 Found ${allSubjects.length} total subjects in database`);

    // Group by code and semester to find potential common subjects
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

    // Find subjects that appear in multiple branches (potential common subjects)
    const potentialCommonSubjects = [];
    
    Object.values(subjectGroups).forEach(group => {
      if (group.branches.size > 1) {
        // Subject exists in multiple branches - likely a common subject
        potentialCommonSubjects.push({
          code: group.code,
          name: group.name,
          semester: group.semester,
          branchCount: group.branches.size,
          branches: Array.from(group.branches),
          subjectIds: group.subjects.map(s => s._id.toString()),
          isCommon: group.subjects[0]?.isCommon || false
        });
      }
    });

    // Sort by semester and code
    potentialCommonSubjects.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.code.localeCompare(b.code);
    });

    console.log('\n📊 Potential Common Subjects (same code in multiple branches):');
    console.log('='.repeat(80));
    
    if (potentialCommonSubjects.length === 0) {
      console.log('No subjects found that appear in multiple branches.');
    } else {
      potentialCommonSubjects.forEach(subject => {
        console.log(`\n📘 ${subject.name} (${subject.code}) - Semester ${subject.semester}`);
        console.log(`   Branches: ${subject.branches.join(', ')} (${subject.branchCount} branches)`);
        console.log(`   Currently marked as common: ${subject.isCommon ? '✅ YES' : '❌ NO'}`);
        console.log(`   Subject IDs: ${subject.subjectIds.join(', ')}`);
      });
    }

    // Show subjects already marked as common
    const alreadyCommon = await SubjectModel.find({ isCommon: true }).lean();
    console.log('\n\n✅ Subjects Already Marked as Common:');
    console.log('='.repeat(80));
    
    if (alreadyCommon.length === 0) {
      console.log('No subjects are currently marked as common.');
    } else {
      alreadyCommon.forEach(subject => {
        console.log(`\n📘 ${subject.name} (${subject.code}) - Semester ${subject.semester}`);
        console.log(`   Branch: ${subject.branch || 'N/A (common subject)'}`);
        console.log(`   ID: ${subject._id}`);
      });
    }

    // Show subjects by semester
    console.log('\n\n📚 Subjects by Semester:');
    console.log('='.repeat(80));
    
    const bySemester = {};
    allSubjects.forEach(subject => {
      if (!bySemester[subject.semester]) {
        bySemester[subject.semester] = [];
      }
      bySemester[subject.semester].push(subject);
    });

    Object.keys(bySemester).sort().forEach(sem => {
      const subjects = bySemester[sem];
      const commonCount = subjects.filter(s => s.isCommon).length;
      console.log(`\nSemester ${sem}: ${subjects.length} subjects (${commonCount} marked as common)`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findCommonSubjects();

