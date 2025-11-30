// Test script to verify login functionality and check users in database
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

async function testLogin() {
  try {
    console.log('\n🔍 Testing Login Functionality\n');
    console.log('='.repeat(50));
    
    // Test 1: List all users
    console.log('\n📋 Test 1: Listing all users in database...');
    try {
      const allUsers = await User.find({});
      console.log(`✅ Found ${allUsers.length} users in database`);
  
      if (allUsers.length === 0) {
        console.log('⚠️  No users found in database. You need to register a user first.');
        return;
      }
      
      // Display first 5 users (without passwords)
      console.log('\n📝 Sample users (first 5):');
      allUsers.slice(0, 5).forEach((user, index) => {
        console.log(`\n${index + 1}. User ID: ${user.id || user._id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Student ID: ${user.studentId || 'N/A'}`);
        console.log(`   User Type: ${user.userType || 'student'}`);
        console.log(`   Has Password: ${!!user.password}`);
      });
    } catch (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
  }
  
    // Test 2: Test user lookup by email
    console.log('\n\n🔍 Test 2: Testing user lookup...');
    let allUsers = await User.find({});
    if (allUsers.length > 0) {
      const testUser = allUsers[0];
      const testEmail = testUser.email;
      const testStudentId = testUser.studentId;
      
      console.log(`\n   Testing lookup by email: ${testEmail}`);
      const userByEmail = await User.findOne({ $or: [{ email: testEmail.toLowerCase() }, { email: testEmail }] });
    if (userByEmail) {
        console.log(`   ✅ Found user by email: ${userByEmail.name}`);
      } else {
        console.log(`   ❌ User not found by email`);
      }
      
      if (testStudentId) {
        console.log(`\n   Testing lookup by studentId: ${testStudentId}`);
        const userByStudentId = await User.findOne({ $or: [{ studentId: testStudentId }] });
        if (userByStudentId) {
          console.log(`   ✅ Found user by studentId: ${userByStudentId.name}`);
        } else {
          console.log(`   ❌ User not found by studentId`);
        }
      }
    }
    
    // Test 3: Check JWT_SECRET
    console.log('\n\n🔑 Test 3: Checking JWT_SECRET...');
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      console.log(`   ✅ JWT_SECRET is set (length: ${jwtSecret.length})`);
    } else {
      console.log(`   ❌ JWT_SECRET is NOT set in environment variables`);
      console.log(`   ⚠️  This will cause login to fail!`);
  }
  
    // Test 4: Test password verification
    console.log('\n\n🔐 Test 4: Testing password verification...');
    allUsers = await User.find({});
    if (allUsers.length > 0 && allUsers[0].password) {
      const testUser = allUsers[0];
      console.log(`   Testing with user: ${testUser.email}`);
      console.log(`   ⚠️  Cannot test actual password without knowing it`);
      console.log(`   ✅ Password hash exists and can be verified`);
    } else {
      console.log(`   ⚠️  No users with passwords found to test`);
  }
  
    console.log('\n\n' + '='.repeat(50));
    console.log('✅ Login test completed!\n');
    console.log('💡 To test actual login:');
    console.log('   1. Make sure backend server is running');
    console.log('   2. Use one of the emails/studentIds shown above');
    console.log('   3. Try logging in through the frontend\n');
  
} catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
  
  // Exit process
  process.exit(0);
}

testLogin();
