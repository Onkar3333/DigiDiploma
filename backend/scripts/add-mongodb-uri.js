import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

console.log('🔧 Adding MONGODB_URI to .env file...');
console.log('='.repeat(60));

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file does not exist!');
  console.log(`   Creating: ${envPath}`);
  fs.writeFileSync(envPath, '');
}

const content = fs.readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

// Check if MONGODB_URI already exists
const hasMongoUri = lines.some(line => 
  line.trim().startsWith('MONGODB_URI=') && !line.trim().startsWith('#')
);

if (hasMongoUri) {
  console.log('⚠️  MONGODB_URI already exists in .env file!');
  console.log('\n📋 Current MONGODB_URI lines:');
  lines.forEach((line, index) => {
    if (line.includes('MONGODB_URI')) {
      console.log(`   Line ${index + 1}: ${line}`);
    }
  });
  console.log('\n💡 If you want to update it, manually edit backend/.env file');
  process.exit(0);
}

// MongoDB connection string
const mongoUri = 'mongodb+srv://digidiploma:%40Dada2006@cluster0.rfmryz3.mongodb.net/digidiploma?retryWrites=true&w=majority';
const newLine = `MONGODB_URI=${mongoUri}`;

// Add to end of file (with newline if needed)
let newContent = content;
if (!newContent.endsWith('\n') && newContent.length > 0) {
  newContent += '\n';
}
newContent += `\n# MongoDB Atlas Connection\n${newLine}\n`;

fs.writeFileSync(envPath, newContent, 'utf-8');

console.log('✅ MONGODB_URI added to .env file!');
console.log(`\n📝 Added line:`);
console.log(`   ${newLine}`);
console.log(`\n💡 Now run: npm run test:mongodb`);

