import mongoose from 'mongoose';

let isMongoReady = false;
let mongoConnection = null;

export const connectMongoDB = async () => {
  // Read env vars at connection time (not at module load time)
  const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
  
  if (!MONGODB_URI) {
    console.log('⚠️ MongoDB URI not configured; using Firebase/local fallback');
    console.log('   Set MONGODB_URI or DATABASE_URL in backend/.env');
    console.log('   Current env check - MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    console.log('   Current env check - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    return false;
  }
  
  // Mask password in logs for security
  const maskedUri = MONGODB_URI.replace(/:[^:@]+@/, ':****@');
  console.log(`🔌 Attempting MongoDB connection: ${maskedUri}`);

  if (mongoConnection && mongoose.connection.readyState === 1) {
    isMongoReady = true;
    return true;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    mongoConnection = mongoose.connection;
    isMongoReady = true;
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    isMongoReady = false;
    return false;
  }
};

// Don't auto-connect on import - let server.js call it after env is loaded
// connectMongoDB().catch(console.error);

// Handle connection events
if (typeof mongoose !== 'undefined') {
  mongoose.connection.on('disconnected', () => {
    isMongoReady = false;
    console.log('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
    isMongoReady = false;
  });

  mongoose.connection.on('reconnected', () => {
    isMongoReady = true;
    console.log('✅ MongoDB reconnected');
  });
}

export { isMongoReady, mongoConnection };
export default { connectMongoDB, isMongoReady, mongoConnection };

