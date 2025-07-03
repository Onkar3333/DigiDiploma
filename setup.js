const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-gurukul';

// Material schema
const materialSchema = new mongoose.Schema({
  title: String,
  type: String,
  subject: String,
  category: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', materialSchema);

// Subscription schema
const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  startDate: Date,
  endDate: Date
});
const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Announcement schema
const announcementSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model('Announcement', announcementSchema);

// Quiz schema
const quizSchema = new mongoose.Schema({
  title: String,
  branch: String,
  semester: String,
  questions: Array,
  createdAt: { type: Date, default: Date.now }
});
const Quiz = mongoose.model('Quiz', quizSchema);

async function setup() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


  // Create initial admin user
  const adminEmail = 'admin@digitalgurukul.com';
  const adminPassword = 'admin123';
  await User.deleteMany({ email: adminEmail }); // Remove any existing admin user
  let admin = new User({
    name: 'Admin',
    email: adminEmail,
    password: adminPassword, // plain text, will be hashed by pre-save hook
    role: 'admin',
    isActive: true,
    college: 'Admin College',
    branch: 'Admin Branch'
  });
  console.log('About to save admin:', admin);
  admin.markModified('password'); // Ensure pre-save hook runs
  await admin.save();
  console.log('Saved admin:', admin);

  // Create empty collections by inserting and removing a dummy doc
  await Material.create({ title: 'dummy', type: 'note', subject: 'dummy', category: 'dummy' });
  await Material.deleteMany({ title: 'dummy' });
  await Subscription.create({ user: admin._id, status: 'inactive', startDate: new Date(), endDate: new Date() });
  await Subscription.deleteMany({ status: 'inactive' });
  await Announcement.create({ title: 'dummy', content: 'dummy' });
  await Announcement.deleteMany({ title: 'dummy' });
  await Quiz.create({ title: 'dummy', branch: 'dummy', semester: 'dummy', questions: [] });
  await Quiz.deleteMany({ title: 'dummy' });

  console.log('Collections initialized.');
  await mongoose.disconnect();
  console.log('Setup complete.');
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
}); 