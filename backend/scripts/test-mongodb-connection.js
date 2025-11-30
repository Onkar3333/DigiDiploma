import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
const envPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath, override: true });

console.log('🔍 Environment Check:');
console.log('='.repeat(60));
console.log(`📁 .env file path: ${envPath}`);
console.log(`📄 .env file exists: ${result.error ? '❌ NO' : '✅ YES'}`);
if (result.error) {
  console.log(`   Error: ${result.error.message}`);
}

console.log('\n🔑 Environment Variables:');
console.log('='.repeat(60));
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? '✅ SET' : '❌ NOT SET'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET'}`);

if (mongoUri) {
  // Mask password for security
  const maskedUri = mongoUri.replace(/:[^:@]+@/, ':****@');
  console.log(`\n🔗 Connection String (masked): ${maskedUri}`);
  
  // Check if password is URL-encoded
  if (mongoUri.includes('@') && !mongoUri.includes('%40')) {
    console.log('\n⚠️  WARNING: Password may contain special characters that need URL encoding!');
    console.log('   If your password has @, :, /, ?, #, [, ], use %40, %3A, %2F, %3F, %23, %5B, %5D');
  }
  
  console.log('\n🔌 Attempting MongoDB connection...');
  console.log('='.repeat(60));
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Ready State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📊 Collections in database: ${collections.length}`);
    if (collections.length > 0) {
      console.log('   Collections:', collections.map(c => c.name).join(', '));
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB connection failed!');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Possible issues:');
      console.error('   1. Username or password is incorrect');
      console.error('   2. Password needs URL encoding (e.g., @ → %40)');
      console.error('   3. User doesn\'t have access to the database');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Possible issues:');
      console.error('   1. Cluster hostname is incorrect');
      console.error('   2. Network connectivity issue');
      console.error('   3. IP address not whitelisted in MongoDB Atlas');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Possible issues:');
      console.error('   1. IP address not whitelisted in MongoDB Atlas');
      console.error('   2. Network firewall blocking connection');
      console.error('   3. MongoDB Atlas cluster is paused or unavailable');
    }
    
    process.exit(1);
  }
} else {
  console.log('\n❌ MongoDB URI not found in environment variables!');
  console.log('='.repeat(60));
  console.log('💡 To fix this:');
  console.log('   1. Open backend/.env file');
  console.log('   2. Add this line:');
  console.log('      MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/digidiploma?retryWrites=true&w=majority');
  console.log('   3. Replace username, password, and cluster with your actual values');
  console.log('   4. URL-encode special characters in password (e.g., @ → %40)');
  console.log('   5. Save the file and run this test again');
  process.exit(1);
}

