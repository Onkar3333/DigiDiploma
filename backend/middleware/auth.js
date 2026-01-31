import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const getJWTSecret = () => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return JWT_SECRET;
};

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, getJWTSecret());
    
    // MongoDB uses _id, but JWT might have id or _id
    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Try to find user by _id (MongoDB format) or id
    let user = await User.findById(userId);
    
    // If not found by _id, try by id field (for backward compatibility)
    if (!user) {
      user = await User.findOne({ id: userId });
    }
    
    if (!user) {
      console.error(`❌ User not found for userId: ${userId}`);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Convert to JSON format expected by frontend
    const userJson = user.toJSON ? user.toJSON() : user;
    // Ensure both id and _id are present for frontend compatibility
    req.user = {
      ...userJson,
      id: userJson.id || userJson._id,
      _id: userJson._id || userJson.id,
      userId: userJson.id || userJson._id
    };
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

export const requireStudent = (req, res, next) => {
  if (req.user && req.user.userType === 'student') {
    next();
  } else {
    res.status(403).json({ error: 'Student access required' });
  }
};

/** Optional auth: sets req.user when token valid, req.user=null when no/invalid token. Never returns 401. */
export const authenticateOptional = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJWTSecret());
    const userId = decoded.userId;
    if (!userId) {
      req.user = null;
      return next();
    }

    let user = await User.findById(userId);
    if (!user) user = await User.findOne({ id: userId });
    if (!user) {
      req.user = null;
      return next();
    }

    const userJson = user.toJSON ? user.toJSON() : user;
    req.user = {
      ...userJson,
      id: userJson.id || userJson._id,
      _id: userJson._id || userJson.id,
      userId: userJson.id || userJson._id
    };
    next();
  } catch {
    req.user = null;
    next();
  }
};

// Authenticate token but allow expired tokens (for refresh endpoint)
export const authenticateTokenAllowExpired = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Decode token without verification to get userId even if expired
    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
    } catch (error) {
      // If token is expired, decode without verification
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        throw error;
      }
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;
    
    // Try to find user by _id (MongoDB format) or id
    let user = await User.findById(userId);
    
    // If not found by _id, try by id field (for backward compatibility)
    if (!user) {
      user = await User.findOne({ id: userId });
    }
    
    if (!user) {
      console.error(`❌ User not found for userId: ${userId}`);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Convert to JSON format expected by frontend
    const userJson = user.toJSON ? user.toJSON() : user;
    // Ensure both id and _id are present for frontend compatibility
    req.user = {
      ...userJson,
      id: userJson.id || userJson._id,
      _id: userJson._id || userJson.id,
      userId: userJson.id || userJson._id
    };
    
    next();
  } catch (error) {
    console.error('❌ Authentication error (allow expired):', error.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
};