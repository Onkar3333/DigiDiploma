import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { isMongoReady } from '../lib/mongodb.js';
import FirebaseUser from './FirebaseUser.js'; // Fallback

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  studentId: { type: String, sparse: true, index: true },
  college: { type: String, default: '' },
  branch: { type: String, default: '' },
  semester: { type: Number, default: null },
  userType: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  fcmToken: { type: String, default: '' },
  fcmTokenUpdatedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.password; return ret; } }
});

// Note: email index is automatically created by unique: true
// Only add additional indexes that aren't already created

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

// Export UserModel for password updates
export { UserModel };

class MongoUser {
  constructor(data) {
    this._id = data._id?.toString();
    this.id = this._id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.studentId = data.studentId;
    this.college = data.college;
    this.branch = data.branch;
    this.semester = data.semester;
    this.userType = data.userType || 'student';
    this.phone = data.phone || '';
    this.address = data.address || '';
    this.bio = data.bio || '';
    this.avatar = data.avatar || '';
    this.fcmToken = data.fcmToken || '';
    this.fcmTokenUpdatedAt = data.fcmTokenUpdatedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(userData) {
    if (isMongoReady) {
      try {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await UserModel.create({
          ...userData,
          password: hashedPassword,
        });
        return new MongoUser(user.toObject());
      } catch (error) {
        console.error('MongoDB user create error:', error);
        // Fallback to Firebase
        return await FirebaseUser.create(userData);
      }
    }
    return await FirebaseUser.create(userData);
  }

  static async findById(id) {
    if (isMongoReady) {
      try {
        const user = await UserModel.findById(id);
        return user ? new MongoUser(user.toObject()) : null;
      } catch (error) {
        console.error('MongoDB user findById error:', error);
      }
    }
    return await FirebaseUser.findById(id);
  }

  static async findOne(query) {
    if (isMongoReady) {
      try {
        let user;
        if (query.$or) {
          // Handle $or queries - check all email and studentId values
          const emailValues = query.$or.filter((q) => q.email).map((q) => q.email);
          const studentIdValues = query.$or.filter((q) => q.studentId).map((q) => q.studentId);
          
          // Try to find by email (check all email values, normalized to lowercase)
          for (const emailValue of emailValues) {
            if (emailValue) {
              // Try both lowercase and original case
              user = await UserModel.findOne({ 
                $or: [
                  { email: emailValue.toLowerCase() },
                  { email: emailValue }
                ]
              });
              if (user) break;
            }
          }
          
          // If not found by email, try studentId
          if (!user && studentIdValues.length > 0) {
            for (const studentIdValue of studentIdValues) {
              if (studentIdValue) {
                user = await UserModel.findOne({ studentId: studentIdValue });
                if (user) break;
              }
            }
          }
        } else {
          // Handle regular queries - normalize email to lowercase if present
          if (query.email) {
            const normalizedQuery = { ...query, email: query.email.toLowerCase() };
            user = await UserModel.findOne(normalizedQuery);
          } else {
            user = await UserModel.findOne(query);
          }
        }
        return user ? new MongoUser(user.toObject()) : null;
      } catch (error) {
        console.error('MongoDB user findOne error:', error);
      }
    }
    return await FirebaseUser.findOne(query);
  }

  static async find(query = {}) {
    if (isMongoReady) {
      try {
        const users = await UserModel.find(query);
        return users.map(u => new MongoUser(u.toObject()));
      } catch (error) {
        console.error('MongoDB user find error:', error);
      }
    }
    return await FirebaseUser.find(query);
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    
    if (isMongoReady) {
      try {
        const user = await UserModel.findByIdAndDelete(id);
        if (!user) {
          // Try Firebase as fallback
          return await FirebaseUser.findByIdAndDelete(id);
        }
        return new MongoUser(user.toObject());
      } catch (error) {
        console.error('MongoDB user findByIdAndDelete error:', error);
        // Try Firebase as fallback
        try {
          return await FirebaseUser.findByIdAndDelete(id);
        } catch (firebaseError) {
          console.error('Firebase user findByIdAndDelete error:', firebaseError);
          return null;
        }
      }
    }
    // Fallback to Firebase if MongoDB is not ready
    return await FirebaseUser.findByIdAndDelete(id);
  }

  async save() {
    if (!isMongoReady) {
      throw new Error('MongoDB is not ready. Cannot save user.');
    }

    try {
      const userId = this._id || this.id;
      if (!userId) {
        throw new Error('User ID is required to save');
      }

      // Prepare update data, filtering out undefined values and internal fields
      const updateData = {
        name: this.name,
        email: this.email,
        password: this.password,
        studentId: this.studentId,
        college: this.college || '',
        branch: this.branch || '',
        semester: this.semester !== undefined ? this.semester : null,
        userType: this.userType || 'student',
        phone: this.phone || '',
        address: this.address || '',
        bio: this.bio || '',
        avatar: this.avatar || '',
        fcmToken: this.fcmToken || '',
        fcmTokenUpdatedAt: this.fcmTokenUpdatedAt || null,
        updatedAt: new Date()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updated = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (updated) {
        Object.assign(this, updated.toObject());
        this.id = this._id;
        return this;
      }
      
      throw new Error('User not found for update');
    } catch (error) {
      console.error('MongoDB user save error:', error);
      throw error;
    }
  }

  async delete() {
    if (isMongoReady) {
      try {
        await UserModel.findByIdAndDelete(this.id);
        return true;
      } catch (error) {
        console.error('MongoDB user delete error:', error);
      }
    }
    const firebaseUser = await FirebaseUser.findById(this.id);
    if (firebaseUser) return await firebaseUser.delete();
    return false;
  }

  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  toJSON() {
    const { password, ...rest } = this;
    // Ensure both id and _id are present for frontend compatibility
    return {
      ...rest,
      id: this.id || this._id,
      _id: this._id || this.id,
      userId: this.id || this._id
    };
  }
}

export default MongoUser;

