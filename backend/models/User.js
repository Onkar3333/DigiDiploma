// Unified User model - FORCES MongoDB usage (no Firebase fallback)
import MongoUser from './MongoUser.js';
import { isMongoReady } from '../lib/mongodb.js';

// ALWAYS use MongoDB - no Firebase fallback
// If MongoDB is not ready, throw error instead of falling back to Firebase
const User = MongoUser;

export default User;
export { MongoUser };

