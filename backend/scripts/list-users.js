import { db } from '../lib/firebase.js';

async function main() {
  try {
    const snap = await db.collection('users').get();
    const users = [];
    snap.forEach(doc => users.push({ id: doc.id, ...doc.data(), password: undefined }));
    console.log('Users count:', users.length);
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error listing users:', e);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}


