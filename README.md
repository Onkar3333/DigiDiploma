# DigiDiploma - Student Portal

A comprehensive educational portal with admin and student dashboards, featuring real-time updates, material management, and subscription systems.

## Features

### Admin Features
- 📊 Dashboard with analytics and statistics
- 📚 Upload and manage educational materials (PDFs, videos, documents)
- 👥 User management (students and admins)
- 💳 Subscription management and tracking
- 📢 Create and manage announcements
- 🧠 Quiz creation and management
- 🎁 Offer management
- 📈 Real-time analytics and reports

### Student Features
- 📖 Access to subject-wise materials
- 📱 View and download PDFs
- 🎥 Video streaming with progress tracking
- 🧠 Take quizzes and track performance
- 💳 Subscribe to semesters with different plans
- 📢 View announcements and offers
- 📊 Track learning progress

### Common Features
- 🔐 Secure authentication with JWT
- 📱 Responsive design for all devices
- ⚡ Real-time updates using Socket.IO
- 📧 Email notifications (configurable)
- 🎨 Beautiful UI with Indian cultural theme

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Authentication**: JWT, bcrypt
- **File Upload**: Multer (ready for implementation)

## Prerequisites

1. **Node.js** (v14 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **MongoDB**
   - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Or use MongoDB Atlas (cloud service)
   - Verify installation: `mongod --version`

3. **Git** (optional)
   - Download from [git-scm.com](https://git-scm.com/)

## Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd digidiploma-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the values:
   ```env
   MONGODB_URI=mongodb://localhost:27017/digidiploma
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3000
   ```

4. **Start MongoDB**
   ```bash
   # On Windows
   mongod
   
   # On macOS/Linux
   sudo systemctl start mongod
   ```

5. **Start the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - Main portal: http://localhost:3000
   - Admin dashboard: http://localhost:3000/admin
   - Student dashboard: http://localhost:3000/student

## Initial Setup

### Create Admin Account

1. Go to http://localhost:3000
2. Click "New Candidate Registration"
3. Fill in the form with admin details:
   - Name: Admin User
   - Email: admin@digidiploma.com
   - Password: admin123
   - College: Any college
   - Branch: Any branch
   - Role: admin (you'll need to manually set this in the database for now)

### Alternative: Create Admin via API

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@digidiploma.com",
    "password": "admin123",
    "college": "Government Polytechnic, Pune",
    "branch": "Computer Engineering",
    "role": "admin"
  }'
```

## Usage

### Admin Access
1. Go to http://localhost:3000/admin
2. Login with admin credentials
3. Access dashboard features:
   - Upload materials
   - Manage users
   - Create announcements
   - View analytics

### Student Access
1. Go to http://localhost:3000
2. Register as a new student
3. Login and access:
   - Browse materials
   - Take quizzes
   - Manage subscriptions

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Admin Routes
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/toggle-status` - Toggle user status
- `DELETE /api/admin/users/:id` - Delete user

### Materials
- `GET /api/materials` - Get materials
- `POST /api/materials` - Upload material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material

### Subscriptions
- `GET /api/subscriptions` - Get subscriptions
- `POST /api/subscriptions` - Create subscription
- `PUT /api/subscriptions/:id/status` - Update status

## File Structure

```
digidiploma-portal/
├── public/                 # Static files
│   ├── index.html         # Main portal
│   ├── admin.html         # Admin dashboard
│   └── student.html       # Student dashboard
├── models/                # Database models
│   ├── User.js
│   ├── Material.js
│   └── Subscription.js
├── routes/                # API routes
│   ├── auth.js
│   ├── admin.js
│   ├── student.js
│   ├── materials.js
│   ├── announcements.js
│   ├── quizzes.js
│   └── subscriptions.js
├── server.js              # Main server file
├── package.json           # Dependencies
└── README.md             # This file
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/digital-gurukul

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Server Port
PORT=3000

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Database Configuration

The application uses MongoDB. Make sure MongoDB is running and accessible.

## Development

### Adding New Features

1. **Create new routes** in the `routes/` directory
2. **Add models** in the `models/` directory if needed
3. **Update frontend** in the `public/` directory
4. **Test thoroughly** before deployment

### File Upload

To enable file uploads:

1. Install additional dependencies:
   ```bash
   npm install multer cloudinary
   ```

2. Configure cloud storage (Cloudinary, AWS S3, etc.)
3. Update material upload routes

### Email Notifications

To enable email notifications:

1. Configure email settings in `.env`
2. Install nodemailer: `npm install nodemailer`
3. Create email service functions

## Deployment

### Local Production
```bash
npm start
```

### Cloud Deployment

1. **Heroku**
   ```bash
   heroku create your-app-name
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   git push heroku main
   ```

2. **Vercel**
   - Connect your GitHub repository
   - Set environment variables
   - Deploy automatically

3. **Railway**
   - Connect your repository
   - Set environment variables
   - Deploy

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Port Already in Use**
   - Change PORT in `.env`
   - Kill existing process: `npx kill-port 3000`

3. **JWT Token Issues**
   - Clear browser storage
   - Check JWT_SECRET in `.env`
   - Restart server

4. **File Upload Issues**
   - Check file size limits
   - Verify upload directory permissions
   - Ensure proper MIME types

### Logs

Check server logs for detailed error information:
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact: support@digitalgurukul.com

## Changelog

### v1.0.0
- Initial release
- Basic authentication
- Material management
- User management
- Subscription system
- Real-time updates 