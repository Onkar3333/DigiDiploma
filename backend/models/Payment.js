// Unified Payment model - FORCES MongoDB usage (no Firebase fallback)
import MongoPayment from './MongoPayment.js';
import { isMongoReady } from '../lib/mongodb.js';

// ALWAYS use MongoDB - no Firebase fallback
const Payment = MongoPayment;

export default Payment;
export { MongoPayment };

