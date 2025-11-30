import express from "express";
const router = express.Router();
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { authenticateToken, requireAdmin, authenticateTokenAllowExpired } from "../middleware/auth.js";
import { validate, userRegistrationSchema, userLoginSchema, changePasswordSchema, adminChangePasswordSchema } from "../middleware/validation.js";
import User from "../models/User.js";
// MongoDB is the sole data store - no Firebase
import notificationService from "../websocket.js";

// Import nodemailer (already in dependencies)
import nodemailer from "nodemailer";

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map(); // { email/phone: { otp, expiresAt } }
// Cooldown tracking for OTP resend (prevents spam - 15 seconds)
const otpCooldown = new Map(); // { email/phone: lastSentTimestamp }

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email OTP - Real email sending with proper error handling
const sendEmailOTP = async (email, otp) => {
  try {
    // Always log OTP to console for development/debugging
    console.log('\n========================================');
    console.log('📧 EMAIL OTP VERIFICATION');
    console.log('========================================');
    console.log(`Email: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires in: 10 minutes`);
    console.log('========================================\n');
    
    // Check if SMTP is configured
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;
    
    if (!smtpUser || !smtpPass) {
      console.log('⚠️ SMTP credentials not configured. OTP logged to console only.');
      console.log('   To enable email sending, set SMTP_USER and SMTP_PASS in .env file');
      return { sent: false, method: 'console' };
    }
    
    // Create transporter with proper configuration
    // Handle TLS certificate issues (allow self-signed in development)
    const tlsRejectEnv = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').toLowerCase();
    const allowSelfSigned = tlsRejectEnv === 'false' || tlsRejectEnv === '0' || tlsRejectEnv === 'no' || process.env.NODE_ENV === 'development';
    
    // Store original TLS reject setting
    const originalTLSReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    
    // Temporarily disable certificate validation if needed (for development/testing)
    // This is necessary because Node.js checks certificates before nodemailer's TLS options
    if (allowSelfSigned) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    try {
      // Configure transporter with TLS options
      const transporterConfig = {
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: !allowSelfSigned,
          minVersion: 'TLSv1.2'
        },
        // Connection timeouts
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      };
      
      // For Gmail and other services, add servername to TLS
      if (smtpHost.includes('gmail.com')) {
        transporterConfig.tls.servername = smtpHost;
      }
      
      const transporter = nodemailer.createTransport(transporterConfig);
    
    // Send email
    const mailOptions = {
      from: `"DigiDiploma" <${smtpFrom}>`,
      to: email,
      subject: 'DigiDiploma - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0;">DigiDiploma Email Verification</h2>
            <p style="color: #4b5563; font-size: 16px;">Your OTP for email verification is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #6366f1; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This OTP will expire in 10 minutes.</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">If you didn't request this verification, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© DigiDiploma - Educational Platform</p>
          </div>
        </div>
      `
    };

      const info = await transporter.sendMail(mailOptions);
      
      // Restore original TLS setting
      if (allowSelfSigned) {
        if (originalTLSReject !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTLSReject;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }
      
      console.log(`✅ Email sent successfully to ${email}`);
      console.log(`   Message ID: ${info.messageId}`);
      
      return { sent: true, method: 'email', messageId: info.messageId };
    } finally {
      // Always restore original TLS setting, even if there was an error
      if (allowSelfSigned) {
        if (originalTLSReject !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTLSReject;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error sending email OTP:', error.message);
    console.error('   Error details:', error);
    
    // Return error details for better debugging
    return { 
      sent: false, 
      method: 'console', 
      error: error.message,
      note: 'OTP is logged to console. Check SMTP configuration if email sending is required.'
    };
  }
};

// Phone OTP functionality removed - only email OTP is supported

const getJWTSecret = () => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return JWT_SECRET;
};

// Rate limiting for auth routes (relaxed in development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for OTP endpoints (allows more frequent requests)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 1000, // Very lenient in development
  message: {
    error: 'Too many OTP requests. Please wait a few minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting entirely in development environment
    return process.env.NODE_ENV !== 'production';
  }
});

router.post("/register", authLimiter, validate(userRegistrationSchema), async (req, res) => {
  const { name, email, password, college, studentId, branch, semester, userType, phone } = req.body;
  try {
    // Verify email OTP (required)
    const emailOTPData = otpStore.get(`email:${email}`);
    if (!emailOTPData || !emailOTPData.verified) {
      return res.status(400).json({ error: "Email not verified. Please verify your email with OTP first." });
    }
    
    // Normalize email to lowercase for checking and creating (MongoDB schema enforces lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`📝 Processing registration with email: ${normalizedEmail} (original: ${email})`);
    
    // Check for existing user by email or studentId (phone is optional, no OTP required)
    const existingUser = await User.findOne({ 
      $or: [
        { email: normalizedEmail }, 
        { studentId }
      ] 
    });
    if (existingUser) {
      return res.status(409).json({ error: "User with this email, enrollment number, or phone number already exists." });
    }
    
    // Create user - password will be hashed by User.create() method
    const created = await User.create({
      name,
      email: normalizedEmail, // Always use lowercase email
      password: password, // Pass plain password - User.create() will hash it
      college,
      studentId,
      branch,
      semester: semester || null,
      userType: userType || 'student',
      phone: phone || ''
    });
    
    console.log(`✅ User created successfully: ${created.email} (ID: ${created.id || created._id})`);
    
    // Clear OTP after successful registration
    otpStore.delete(`email:${email}`);
    
    // Notify admins in real-time
    try { await notificationService.notifyUserCreated(created); } catch {}
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: (created.id || created._id), userType: created.userType },
      getJWTSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: {
        id: (created.id || created._id),
        name: created.name,
        email: created.email,
        studentId: created.studentId,
        branch: created.branch,
        semester: created.semester,
        userType: created.userType,
        phone: created.phone
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login route: allow login by email or studentId and password
router.post("/login", authLimiter, async (req, res) => {
  try {
    // Log request for debugging
    console.log('📥 Login request received:', {
      body: { ...req.body, password: req.body.password ? '***' : undefined },
      headers: req.headers['content-type']
    });
    
    // Manual validation with better error messages
  const { emailOrStudentId, password } = req.body;
    
    if (!emailOrStudentId || !password) {
      console.log('❌ Missing credentials:', { 
        hasEmailOrStudentId: !!emailOrStudentId, 
        hasPassword: !!password 
      });
      return res.status(400).json({ 
        error: "Email/Student ID and password are required",
        received: { 
          emailOrStudentId: !!emailOrStudentId, 
          password: !!password 
        }
      });
    }

    console.log(`🔐 Login attempt for: ${emailOrStudentId}`);
    
    // Normalize email to lowercase for comparison
    const searchValue = emailOrStudentId.trim().toLowerCase();
    const isEmail = searchValue.includes('@');
    
    console.log(`🔍 Searching for user with: ${searchValue} (isEmail: ${isEmail})`);
    
    // Find user by email or studentId
    // Since MongoDB schema has lowercase: true for email, always search with lowercase
    let user;
    if (isEmail) {
      // Search by email (always use lowercase since schema enforces it)
      user = await User.findOne({ email: searchValue });
      console.log(`🔍 Email search result: ${user ? 'Found' : 'Not found'}`);
    } else {
      // Search by studentId (exact match, case-sensitive)
      user = await User.findOne({ studentId: emailOrStudentId.trim() });
      console.log(`🔍 StudentId search result: ${user ? 'Found' : 'Not found'}`);
    }
    
    // If not found, try the other field (in case user entered studentId but we detected it as email or vice versa)
    if (!user) {
      if (isEmail) {
        // Already tried email, try studentId
        console.log(`🔍 Trying studentId as fallback: ${emailOrStudentId.trim()}`);
        user = await User.findOne({ studentId: emailOrStudentId.trim() });
      } else {
        // Already tried studentId, try email (with lowercase)
        console.log(`🔍 Trying email as fallback: ${searchValue}`);
        user = await User.findOne({ email: searchValue });
      }
    }
    
    if (!user) {
      console.log(`❌ User not found: ${searchValue}`);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    console.log(`✅ User found: ${user.email || user.studentId} (ID: ${user.id || user._id})`);

    // Check password
    if (!user.password) {
      console.error('❌ User has no password stored');
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Debug: Log password hash info (without exposing actual hash)
    console.log(`🔍 Password check - User: ${user.email || user.studentId}`);
    console.log(`   Hash length: ${user.password?.length || 0}`);
    console.log(`   Hash format: ${user.password?.substring(0, 7) || 'none'}...`);

    // Try password comparison
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(`   Password comparison result: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    } catch (bcryptError) {
      console.error('❌ Error during password comparison:', bcryptError);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // If password doesn't match, check if it might be double-hashed (legacy users)
    // This happens when users registered before we fixed the double-hashing bug
    if (!isPasswordValid) {
      console.log(`⚠️ Password mismatch - checking for double-hash issue...`);
      
      try {
        // For double-hashed passwords: the stored password is hash(hash(plain))
        // So we need to hash the input password first, then compare
        const inputPasswordHash = await bcrypt.hash(password, 10);
        const isDoubleHashMatch = await bcrypt.compare(inputPasswordHash, user.password);
        
        if (isDoubleHashMatch) {
          console.log(`⚠️ Detected double-hashed password for user: ${user.email || user.studentId}`);
          console.log(`   This user was registered before the password fix.`);
          console.log(`   Fixing password to single hash...`);
          
          // Re-hash the password correctly (single hash)
          const correctHash = await bcrypt.hash(password, 10);
          
          // Import UserModel to update password
          const { UserModel } = await import('../models/MongoUser.js');
          
          if (UserModel) {
            const updateResult = await UserModel.findByIdAndUpdate(
              user.id || user._id, 
              { password: correctHash },
              { new: true }
            );
            
            if (updateResult) {
              console.log(`✅ Password fixed and updated for user: ${user.email || user.studentId}`);
              // Update the user object with the new password for this session
              user.password = correctHash;
              isPasswordValid = true; // Allow login after fixing password
            } else {
              console.error('❌ Could not update password - updateResult is null');
            }
          } else {
            console.error('❌ Could not update password - UserModel not found');
          }
        } else {
          console.log(`   Not a double-hash issue - password is simply incorrect`);
        }
      } catch (fixError) {
        console.error('❌ Error checking/fixing double-hash:', fixError);
      }
    }

    if (!isPasswordValid) {
      console.log(`❌ Invalid password for user: ${user.email || user.studentId}`);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    console.log(`✅ Password valid for user: ${user.email || user.studentId}`);

    // Get user ID (handle both _id and id)
    const userId = user.id || user._id;
    if (!userId) {
      console.error('❌ User has no ID');
      return res.status(500).json({ error: "User data error" });
    }

    // Generate JWT token
    let token;
    try {
      const jwtSecret = getJWTSecret();
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not configured');
      }
      
      token = jwt.sign(
        { userId: userId, userType: user.userType || 'student' },
        jwtSecret,
      { expiresIn: '7d' }
    );

      console.log(`✅ JWT token generated successfully for user: ${userId}`);
    } catch (jwtError) {
      console.error('❌ JWT token generation failed:', jwtError);
      return res.status(500).json({ 
        error: "Failed to generate authentication token", 
        details: jwtError.message 
      });
    }

    console.log(`✅ Login successful, token generated for user: ${userId}`);

    // Ensure all response data is valid and includes both id and _id
    const userResponse = user.toJSON ? user.toJSON() : {
      id: userId,
      _id: userId,
      userId: userId,
      name: user.name || '', 
      email: user.email || '', 
      studentId: user.studentId || '', 
      college: user.college || '', 
      branch: user.branch || '',
      semester: user.semester || null,
      userType: user.userType || 'student'
    };

    const responseData = { 
      message: "Login successful", 
      token,
      user: userResponse
    };

    // Send response with error handling
    try {
      res.status(200).json(responseData);
    } catch (responseError) {
      console.error('❌ Failed to send response:', responseError);
      // Last resort - send plain text
      res.status(200).send(JSON.stringify(responseData));
    }
  } catch (err) {
    console.error("❌ Login error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    if (err.stack) {
    console.error("Error stack:", err.stack);
    }
    
    // Ensure we always send valid JSON
    try {
      res.status(500).json({ 
        error: "Failed to login user", 
        details: err.message || 'Unknown error',
        type: err.name || 'Error',
        ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {})
      });
    } catch (jsonError) {
      // Fallback if JSON.stringify fails
      console.error("❌ Failed to send JSON error response:", jsonError);
      res.status(500).send('Internal server error');
    }
  }
});

// Refresh token endpoint - allows expired tokens
router.post("/refresh", authenticateTokenAllowExpired, async (req, res) => {
  try {
    // Use userId, id, or _id (whichever is available)
    const userId = req.user.userId || req.user.id || req.user._id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid user data' });
    }

    const token = jwt.sign(
      { userId: userId, userType: req.user.userType || 'student' },
      getJWTSecret(),
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (err) {
    console.error("Error refreshing token:", err);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// Get current user profile (must be before /:id route)
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    console.log("GET /profile route hit");
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      college: user.college,
      branch: user.branch,
      semester: user.semester,
      userType: user.userType,
      phone: user.phone || '',
      address: user.address || '',
      bio: user.bio || '',
      avatar: user.avatar || '',
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update current user profile (must be before /:id route)
router.put("/profile", authenticateToken, async (req, res) => {
  console.log("PUT /profile route hit");
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, phone, address, bio, avatar, branch, semester } = req.body;
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update allowed fields (email and studentId cannot be changed)
    const updates = {};
    if (name !== undefined && name !== null && name !== '') {
      updates.name = String(name).trim();
    }
    if (phone !== undefined) {
      updates.phone = phone !== null && phone !== '' ? String(phone).trim() : '';
    }
    if (address !== undefined) {
      updates.address = address !== null && address !== '' ? String(address).trim() : '';
    }
    if (bio !== undefined) {
      updates.bio = bio !== null && bio !== '' ? String(bio).trim() : '';
    }
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      updates.avatar = String(avatar);
    }
    if (branch !== undefined && branch !== null && branch !== '') {
      updates.branch = String(branch).trim();
    }
    if (semester !== undefined && semester !== null && semester !== '') {
      // Convert semester to number if it's a string
      const semNum = typeof semester === 'string' ? parseInt(semester, 10) : semester;
      updates.semester = isNaN(semNum) ? null : semNum;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Update user in MongoDB
    console.log("Updates to apply:", updates);
    
    try {
      // Find user by _id or id
      let user = await User.findById(userId);
      if (!user) {
        user = await User.findOne({ id: userId });
      }
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user fields
      Object.assign(user, updates);
      user.updatedAt = new Date();
      await user.save();

      // Fetch updated user
      const updatedUser = await User.findById(user.id || user._id);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found after update" });
      }
      
      const userResponse = updatedUser.toJSON ? updatedUser.toJSON() : updatedUser;
      
      console.log("Profile updated successfully");
      res.json({
        message: "Profile updated successfully",
        user: {
          id: userResponse.id || userResponse._id,
          _id: userResponse._id || userResponse.id,
          name: userResponse.name,
          email: userResponse.email,
          studentId: userResponse.studentId,
          college: userResponse.college || '',
          branch: userResponse.branch || '',
          semester: userResponse.semester,
          userType: userResponse.userType,
          phone: userResponse.phone || '',
          address: userResponse.address || '',
          bio: userResponse.bio || '',
          avatar: userResponse.avatar || ''
        }
      });
    } catch (updateError) {
      console.error("Update error occurred:", updateError);
      console.error("Error message:", updateError.message);
      res.status(500).json({ 
        error: "Failed to update profile", 
        details: updateError.message 
      });
    }
  } catch (err) {
    console.error("Error updating profile:", err);
    console.error("Error details:", err.message);
    if (err.stack) {
      console.error("Stack trace:", err.stack);
    }
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
});

// Upload profile picture
router.post("/profile/avatar", authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body; // Base64 image or URL
    if (!avatar) {
      return res.status(400).json({ error: "Avatar data is required" });
    }

    // Validate base64 string size (max 2MB)
    if (avatar.length > 3 * 1024 * 1024) { // Approximate 2MB in base64
      return res.status(400).json({ error: "Image too large. Maximum size is 2MB" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update avatar in MongoDB
    try {
      user.avatar = avatar;
      user.updatedAt = new Date();
      await user.save();

      res.json({ message: "Avatar updated successfully", avatar });
    } catch (updateError) {
      console.error("MongoDB update error:", updateError);
      console.error("Update error details:", updateError.message);
      res.status(500).json({ 
        error: "Failed to update avatar", 
        details: updateError.message 
      });
    }
  } catch (err) {
    console.error("Error updating avatar:", err);
    console.error("Error details:", err.message);
    if (err.stack) {
      console.error("Stack trace:", err.stack);
    }
    res.status(500).json({ error: "Failed to update avatar", details: err.message });
  }
});

// Get all users (admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    const usersWithoutPassword = users.map(user => user.toJSON());
    res.status(200).json(usersWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin: Get all users (alternative endpoint)
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    const usersWithoutPassword = users.map(user => user.toJSON());
    res.status(200).json(usersWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Send Email OTP
router.post("/send-email-otp", otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  
  // Check cooldown (30 seconds - increased to prevent spam but allow reasonable retries)
  const cooldownKey = `email:${email}`;
  const lastSent = otpCooldown.get(cooldownKey);
  const cooldownPeriod = 30 * 1000; // 30 seconds in milliseconds
  
  if (lastSent && (Date.now() - lastSent) < cooldownPeriod) {
    const remainingSeconds = Math.ceil((cooldownPeriod - (Date.now() - lastSent)) / 1000);
    return res.status(429).json({ 
      error: `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before requesting a new OTP.`,
      retryAfter: remainingSeconds,
      cooldown: true
    });
  }
  
  // Generate and store OTP first (before any async checks)
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(cooldownKey, { otp, expiresAt, verified: false });
  
  // Update cooldown timestamp
  otpCooldown.set(cooldownKey, Date.now());
  
  // Check if email already exists (non-blocking - don't fail if check fails)
  const checkExisting = async () => {
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return true; // Email exists
      }
      return false; // Email doesn't exist
    } catch (checkError) {
      console.log("Note: Could not check existing email, proceeding anyway");
      return false; // Assume doesn't exist if check fails
    }
  };
  
  // Check in background (don't block OTP sending)
  checkExisting().then(exists => {
    if (exists) {
      console.log(`⚠️ Warning: Email ${email} already registered, but OTP was sent anyway`);
    }
  }).catch(() => {});
  
  try {
    // Send OTP
    const result = await sendEmailOTP(email, otp);
    
    if (result.sent) {
    res.status(200).json({ 
        message: "OTP sent successfully to your email",
        method: result.method,
        note: "Please check your email inbox for the verification code"
      });
    } else {
      // OTP is stored but email wasn't sent (SMTP not configured)
      res.status(200).json({ 
        message: "OTP generated successfully",
        method: result.method || 'console',
        note: result.note || "Check the server console/terminal for your OTP code. Configure SMTP_USER and SMTP_PASS in .env to enable email delivery.",
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only show OTP in development
    });
    }
  } catch (err) {
    console.error("Error sending email OTP:", err);
    // OTP is already stored, so return success anyway
    res.status(200).json({ 
      message: "OTP generated successfully",
      method: 'console',
      note: "Check the server console/terminal for your OTP code. Email sending failed - check SMTP configuration.",
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  }
});

// Verify Email OTP
router.post("/verify-email-otp", otpLimiter, async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }
  
  try {
    const stored = otpStore.get(`email:${email}`);
    
    if (!stored) {
      return res.status(400).json({ error: "OTP not found or expired. Please request a new one." });
    }
    
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(`email:${email}`);
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }
    
    if (stored.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    // Mark as verified (store in a separate map or extend expiry)
    otpStore.set(`email:${email}`, { ...stored, verified: true });
    
    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Error verifying email OTP:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// Phone OTP routes removed - only email OTP is supported

// Forgot Password endpoint
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { emailOrStudentId } = req.body;
  if (!emailOrStudentId) {
    return res.status(400).json({ error: "Email or Enrollment Number is required." });
  }
  try {
    const user = await User.findOne({
      $or: [
        { email: emailOrStudentId },
        { studentId: emailOrStudentId }
      ]
    });
    
    if (user && user.email) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password-reset' },
        getJWTSecret(),
        { expiresIn: '1h' }
      );
      
      // Store reset token (in production, use database)
      otpStore.set(`reset:${user.id}`, { token: resetToken, expiresAt: Date.now() + 60 * 60 * 1000 });
      
      // Send reset email
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const nodemailerModule = getNodemailer();
          if (nodemailerModule) {
            const transporter = nodemailerModule.createTransport({
              service: 'gmail',
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
              }
            });
            
            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
            
            await transporter.sendMail({
              from: process.env.SMTP_USER,
              to: user.email,
              subject: 'DigiDiploma - Password Reset',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #6366f1;">Password Reset Request</h2>
                  <p>You requested to reset your password. Click the link below to reset it:</p>
                  <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
                  <p>Or copy this link: ${resetLink}</p>
                  <p>This link will expire in 1 hour.</p>
                  <p>If you didn't request this, please ignore this email.</p>
                </div>
              `
            });
          }
        } catch (emailErr) {
          console.error('Error sending reset email:', emailErr);
        }
      }
    }
    
    // Always return success for security, even if user not found
    return res.status(200).json({ message: "If this account exists, a password reset link will be sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Change password endpoint (for any authenticated user)
router.post("/change-password", authenticateToken, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    if (!user.password) {
      return res.status(401).json({ error: "Password not set for this account" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password using UserModel
    const { UserModel } = await import('../models/MongoUser.js');
    await UserModel.findByIdAndUpdate(userId, { password: hashedNewPassword });

    console.log(`✅ Password changed successfully for user: ${user.email || user.studentId}`);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Admin: Change password for any user (including themselves)
router.post("/admin/change-password", authenticateToken, requireAdmin, validate(adminChangePasswordSchema), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const adminId = req.user.id;

    // If userId is provided, admin is changing another user's password
    // If not provided, admin is changing their own password
    const targetUserId = userId || adminId;

    // Find target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password using UserModel
    const { UserModel } = await import('../models/MongoUser.js');
    await UserModel.findByIdAndUpdate(targetUserId, { password: hashedNewPassword });

    const isChangingOwnPassword = targetUserId === adminId;
    console.log(`✅ Admin ${req.user.email || req.user.studentId} changed password for ${isChangingOwnPassword ? 'themselves' : `user: ${targetUser.email || targetUser.studentId}`}`);

    res.status(200).json({ 
      message: isChangingOwnPassword 
        ? "Your password has been changed successfully" 
        : "User password has been changed successfully",
      userId: targetUserId
    });
  } catch (err) {
    console.error("Error changing password (admin):", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Delete user endpoint
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Validate MongoDB ObjectId format if it looks like one
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      // Valid MongoDB ObjectId format
    } else if (id.startsWith('usr_')) {
      // Firebase user ID format
    } else {
      // Try anyway, might be a valid ID
    }

    // Use the static method - if it doesn't exist, try alternative approach
    let user;
    if (typeof User.findByIdAndDelete === 'function') {
      user = await User.findByIdAndDelete(id);
    } else {
      // Fallback: find first, then delete
      const foundUser = await User.findById(id);
      if (foundUser) {
        await foundUser.delete();
        user = foundUser;
      }
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Notify via WebSocket (non-blocking)
    try {
      const userId = user.id || user._id || id;
      await notificationService.notifyUserDeleted(userId.toString());
    } catch (notifyError) {
      console.error('Failed to notify user deletion (non-critical):', notifyError?.message || notifyError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ 
      error: "Failed to delete user",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router; 