// Unified Material model - FORCES MongoDB usage (no Firebase fallback)
import MongoMaterial from './MongoMaterial.js';
import { isMongoReady } from '../lib/mongodb.js';

// ALWAYS use MongoDB - no Firebase fallback
const Material = MongoMaterial;

export default Material;
export { MongoMaterial };

