# DigiDiploma - Educational Platform Setup Guide

## 🚀 Quick Start (Firebase Only)

### Prerequisites
- Node.js (v18 or higher)
- Git
- Firebase project with Firestore (see `backend/FIREBASE_SETUP_GUIDE.md`)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd webdesign-main

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../src
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Firebase Admin (Service Account) - required for backend
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxxx
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com

# JWT Configuration (REQUIRED - Generate a secure secret)
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_LOGIN_MAX=5

# Security
BCRYPT_ROUNDS=12
```

### 3. Generate JWT Secret

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start the Application

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd src
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:8080
- Backend API: http://localhost:5000

## 🔧 Security Features Implemented

### ✅ Authentication & Authorization
- JWT-based authentication with secure secret
- Role-based access control (Admin/Student)
- Rate limiting on authentication endpoints
- Password strength validation
- Firebase Firestore for user storage (no MongoDB)

### ✅ Input Validation
- Comprehensive validation using Joi
- File upload validation (type, size)
- SQL injection prevention
- XSS protection

### ✅ Security Headers
- Helmet.js for security headers
- CORS configuration
- Content Security Policy
- Rate limiting

### ✅ Error Handling
- Global error handling middleware
- Error boundaries in React
- Proper error logging
- User-friendly error messages

## 📊 Performance Optimizations

### Database
- Indexed fields for better query performance (Firestore composite indexes where needed)

### Frontend
- Error boundaries for better UX
- Loading states
- Optimized bundle size

## 🛠️ Development

### Available Scripts

**Backend:**
```bash
npm run dev      # Start development server
npm start        # Start production server
```

**Frontend:**
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### API Endpoints

**Authentication:**
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `POST /api/users/refresh` - Refresh token

**Notices:**
- `GET /api/notices/public` - Public notices
- `GET /api/notices` - All notices (Admin)
- `POST /api/notices` - Create notice (Admin)

**Materials:**
- `GET /api/materials/subject/:id` - Get materials by subject
- `POST /api/materials` - Upload material (Admin)
- `POST /api/materials/upload-base64` - Base64 upload

## 🔍 Testing

### Manual Testing Checklist

1. **Authentication**
   - [ ] User registration with validation
   - [ ] User login with rate limiting
   - [ ] Token refresh functionality
   - [ ] Password strength validation

2. **Authorization**
   - [ ] Admin-only routes protection
   - [ ] Student dashboard access
   - [ ] Role-based UI rendering

3. **Security**
   - [ ] Rate limiting on auth endpoints
   - [ ] File upload validation
   - [ ] Input sanitization
   - [ ] CORS configuration

4. **Error Handling**
   - [ ] Network error handling
   - [ ] Validation error display
   - [ ] Error boundary functionality

## 🚨 Security Considerations

### Production Deployment

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique JWT secrets
   - Configure proper CORS origins

2. **Firebase Security**
   - Use Firestore security rules for client apps (backend uses Admin SDK)
   - Restrict service account key access
   - Set up backups/exports for Firestore

3. **File Uploads**
   - Implement virus scanning
   - Use cloud storage for production
   - Set proper file permissions

4. **Monitoring**
   - Set up error logging
   - Monitor rate limiting
   - Track failed login attempts

## 📝 Troubleshooting

### Common Issues

1. **JWT_SECRET not configured**
   - Ensure `.env` file exists in backend directory
   - Check JWT_SECRET is set and at least 32 characters

2. **Firebase connection failed**
   - Verify service account env vars
   - Check project ID and networking

3. **CORS errors**
   - Verify FRONTEND_URL in .env matches your frontend URL
   - Check browser console for specific CORS errors

4. **File upload issues**
   - Check file size limits
   - Verify file type is allowed
   - Ensure uploads directory exists

### Debug Mode

Set `NODE_ENV=development` in your `.env` file for detailed error messages and stack traces.

## 🤝 Contributing

1. Follow the existing code style
2. Add proper error handling
3. Include input validation
4. Write meaningful commit messages
5. Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License.
