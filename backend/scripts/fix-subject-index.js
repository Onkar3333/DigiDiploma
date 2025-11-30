import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

async function fixSubjectIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('subjects');

    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop old unique index on 'code' if it exists
    try {
      const codeIndex = indexes.find(idx => idx.name === 'code_1' || (idx.key.code === 1 && !idx.key.branch));
      if (codeIndex) {
        console.log(`\n🗑️  Dropping old unique index on 'code': ${codeIndex.name}`);
        await collection.dropIndex(codeIndex.name);
        console.log('✅ Old index dropped');
      } else {
        console.log('\n✅ No old unique index on "code" found');
      }
    } catch (dropError) {
      if (dropError.code === 27) {
        console.log('ℹ️  Index does not exist (already dropped or never created)');
      } else {
        console.error('⚠️  Error dropping index:', dropError.message);
      }
    }

    // Create compound unique index on code + branch
    try {
      console.log('\n📝 Creating compound unique index on { code: 1, branch: 1 }...');
      await collection.createIndex(
        { code: 1, branch: 1 },
        { unique: true, name: 'code_branch_unique' }
      );
      console.log('✅ Compound unique index created successfully');
    } catch (createError) {
      if (createError.code === 85) {
        console.log('ℹ️  Index already exists');
      } else {
        console.error('⚠️  Error creating index:', createError.message);
        throw createError;
      }
    }

    // Verify final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''}`);
    });

    console.log('\n✅ Index fix completed!');
    console.log('💡 You can now import the same subject codes to different branches.');
    
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixSubjectIndex()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

