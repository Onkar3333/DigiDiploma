// Unified Subject model - FORCES MongoDB usage (no Firebase fallback)
import MongoSubject from './MongoSubject.js';
import { isMongoReady } from '../lib/mongodb.js';

// ALWAYS use MongoDB - no Firebase fallback
// If MongoDB is not ready, throw error instead of falling back to Firebase
const Subject = MongoSubject;

export default Subject;
export { MongoSubject };

