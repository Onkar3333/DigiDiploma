import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

console.log('🔍 Checking .env file...');
console.log('='.repeat(60));
console.log(`📁 File path: ${envPath}`);
console.log(`📄 File exists: ${fs.existsSync(envPath) ? '✅ YES' : '❌ NO'}`);

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`\n📊 Total lines in .env: ${lines.length}`);
  console.log('\n🔍 Searching for MONGODB_URI or DATABASE_URL...');
  console.log('='.repeat(60));
  
  // Show all lines containing MONGODB or DATABASE
  console.log('\n📋 All lines containing "MONGODB" or "DATABASE":');
  let foundRelated = false;
  lines.forEach((line, index) => {
    const upperLine = line.toUpperCase();
    if (upperLine.includes('MONGODB') || upperLine.includes('DATABASE')) {
      foundRelated = true;
      console.log(`   Line ${index + 1}: ${line}`);
      if (line.trim().startsWith('#')) {
        console.log(`      ⚠️  This line is commented out!`);
      }
    }
  });
  
  if (!foundRelated) {
    console.log('   ❌ No lines found containing "MONGODB" or "DATABASE"');
  }
  
  console.log('\n🔍 Checking for exact match...');
  console.log('='.repeat(60));
  
  let found = false;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('MONGODB_URI') || trimmed.startsWith('DATABASE_URL')) {
      found = true;
      console.log(`\n✅ Found on line ${index + 1}:`);
      console.log(`   Raw line: ${line}`);
      console.log(`   Trimmed: ${trimmed}`);
      
      // Check for common issues
      if (trimmed.includes('"') || trimmed.includes("'")) {
        console.log('   ⚠️  WARNING: Line contains quotes - remove them!');
        console.log('      Should be: MONGODB_URI=mongodb+srv://...');
        console.log('      NOT: MONGODB_URI="mongodb+srv://..."');
      }
      
      if (trimmed.startsWith('#')) {
        console.log('   ⚠️  WARNING: Line is commented out (starts with #)');
      }
      
      if (trimmed.includes(' ')) {
        console.log('   ⚠️  WARNING: Line contains spaces - check for extra spaces');
      }
      
      // Extract the value
      const match = trimmed.match(/^MONGODB_URI=(.+)$/);
      if (match) {
        const value = match[1];
        console.log(`   Value length: ${value.length} characters`);
        if (value.includes('@') && !value.includes('%40')) {
          console.log('   ⚠️  WARNING: Password may need URL encoding (@ should be %40)');
        }
        // Mask password
        const masked = value.replace(/:[^:@]+@/, ':****@');
        console.log(`   Masked value: ${masked}`);
      }
    }
  });
  
  if (!found) {
    console.log('\n❌ MONGODB_URI not found in .env file!');
    console.log('\n💡 Make sure you have this exact line (no quotes, no spaces):');
    console.log('   MONGODB_URI=mongodb+srv://digidiploma:%40Dada2006@cluster0.abcd.mongodb.net/digidiploma?retryWrites=true&w=majority');
    console.log('\n   Replace cluster0.abcd.mongodb.net with your actual cluster hostname');
  }
  
  // Now test dotenv loading
  console.log('\n\n🔍 Testing dotenv loading...');
  console.log('='.repeat(60));
  const result = dotenv.config({ path: envPath, override: true });
  
  if (result.error) {
    console.log(`❌ Error loading .env: ${result.error.message}`);
  } else {
    console.log('✅ .env file loaded successfully');
    console.log(`\n📋 Environment variables after loading:`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET'}`);
    
    if (process.env.MONGODB_URI) {
      const masked = process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@');
      console.log(`   Value: ${masked}`);
    }
  }
} else {
  console.log('\n❌ .env file does not exist!');
  console.log('   Create backend/.env file and add MONGODB_URI');
}

