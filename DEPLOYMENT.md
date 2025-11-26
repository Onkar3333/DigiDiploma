# 🚀 DigiDiploma Deployment Guide

This guide covers the complete deployment process for DigiDiploma from development to production.

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Git
- Stripe account (for payments)
- Domain name (optional)

## 🔧 Environment Setup

### 1. Firebase Configuration

1. **Create Firebase Project**
   ```bash
   firebase login
   firebase projects:create digidiploma-prod
   firebase use digidiploma-prod
   ```

2. **Enable Firebase Services**
   - Firestore Database
   - Authentication (Email/Password)
   - Cloud Storage
   - Cloud Messaging
   - Hosting
   - Analytics

3. **Configure Firestore Security Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Configure Storage Rules**
   ```bash
   firebase deploy --only storage
   ```

### 2. Environment Variables

Create `.env` files for different environments:

**Backend `.env`:**
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
```

**Frontend Environment Variables:**
```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_API_URL=https://your-api-domain.com
```

## 🏗️ Build Process

### 1. Frontend Build
```bash
# Install dependencies
npm install

# Build for production
npm run build:prod

# Test the build locally
npm run preview
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Test the server
npm run dev
```

## 🚀 Deployment Options

### Option 1: Firebase Hosting (Recommended)

1. **Deploy Frontend**
   ```bash
   # Build and deploy
   npm run deploy
   
   # Or manually
   npm run build:prod
   firebase deploy --only hosting
   ```

2. **Deploy Backend to Firebase Functions**
   ```bash
   # Move backend to functions directory
   cp -r backend functions/
   
   # Deploy functions
   firebase deploy --only functions
   ```

### Option 2: Vercel Deployment

1. **Frontend to Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Backend to Railway/Render**
   ```bash
   # Connect your GitHub repo
   # Set environment variables
   # Deploy automatically on push
   ```

### Option 3: Traditional VPS

1. **Server Setup**
   ```bash
   # Install Node.js, PM2, Nginx
   sudo apt update
   sudo apt install nodejs npm nginx
   npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/digidiploma.git
   cd digidiploma
   
   # Install dependencies
   npm install
   cd backend && npm install
   
   # Build frontend
   npm run build:prod
   
   # Start with PM2
   pm2 start backend/server.js --name digidiploma-api
   pm2 startup
   pm2 save
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       # Frontend
       location / {
           root /path/to/digidiploma/dist;
           try_files $uri $uri/ /index.html;
       }
       
       # API
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔐 Security Configuration

### 1. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Materials are publicly readable
    match /materials/{materialId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.userType == 'admin';
    }
    
    // Subscriptions are user-specific
    match /subscriptions/{subscriptionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 2. Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /materials/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.userType == 'admin';
    }
  }
}
```

## 📊 Monitoring & Analytics

### 1. Firebase Analytics
- Automatically enabled with Firebase SDK
- Track user engagement, page views, custom events

### 2. Error Monitoring
```javascript
// Add to main.tsx
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

const analytics = getAnalytics(app);
const perf = getPerformance(app);
```

### 3. Uptime Monitoring
- Use services like UptimeRobot or Pingdom
- Monitor API endpoints and frontend availability

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        npm install
        cd backend && npm install
        
    - name: Build frontend
      run: npm run build:prod
      
    - name: Deploy to Firebase
      run: |
        npm install -g firebase-tools
        firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
      env:
        FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## 🧪 Testing

### 1. Pre-deployment Tests
```bash
# Frontend tests
npm run test

# Backend tests
cd backend && npm test

# E2E tests
npm run test:e2e
```

### 2. Production Testing Checklist
- [ ] User registration/login works
- [ ] File uploads work
- [ ] Payment processing works
- [ ] Push notifications work
- [ ] PWA installation works
- [ ] Offline functionality works
- [ ] All API endpoints respond correctly

## 📈 Performance Optimization

### 1. Frontend Optimization
- Enable gzip compression
- Optimize images (WebP format)
- Implement lazy loading
- Use CDN for static assets

### 2. Backend Optimization
- Enable Redis caching
- Implement database indexing
- Use connection pooling
- Monitor API response times

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**
   - Check API keys in environment variables
   - Verify Firebase project configuration
   - Check Firestore security rules

2. **Payment Processing Issues**
   - Verify Stripe webhook endpoints
   - Check Stripe API keys
   - Test with Stripe test mode first

3. **PWA Installation Issues**
   - Verify manifest.json is accessible
   - Check service worker registration
   - Test on different browsers

4. **Performance Issues**
   - Monitor Firebase usage quotas
   - Check database query performance
   - Optimize image sizes and formats

## 📞 Support

For deployment issues:
- Check Firebase Console for errors
- Review server logs
- Monitor application performance
- Contact support team

## 🔄 Updates & Maintenance

### Regular Maintenance Tasks
- Update dependencies monthly
- Monitor Firebase usage and costs
- Review and update security rules
- Backup Firestore data regularly
- Monitor application performance
- Update SSL certificates

### Version Updates
1. Test updates in staging environment
2. Update dependencies
3. Run full test suite
4. Deploy to production
5. Monitor for issues
6. Rollback if necessary

---

**🎉 Congratulations! Your DigiDiploma platform is now ready for production deployment!**
