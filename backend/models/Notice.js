// Unified Notice model - FORCES MongoDB usage (no Firebase fallback)
import MongoNotice from './MongoNotice.js';
import { isMongoReady } from '../lib/mongodb.js';

// ALWAYS use MongoDB - no Firebase fallback
const Notice = MongoNotice;

export default Notice;
export { MongoNotice };

