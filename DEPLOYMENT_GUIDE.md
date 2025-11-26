# 🚀 DigiDiploma - Complete Technology Stack & Deployment Guide

## 📊 Technology Stack Overview

### **Frontend Technologies**
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.5.3 | Type-safe JavaScript |
| **Vite** | 5.4.1 | Build tool & dev server |
| **Tailwind CSS** | 3.4.11 | Utility-first CSS framework |
| **React Router** | 6.26.2 | Client-side routing |
| **Radix UI** | Latest | Accessible component library |
| **Lucide React** | 0.462.0 | Icon library |
| **Sonner** | 1.5.0 | Toast notifications |
| **React Query** | 5.56.2 | Data fetching & caching |

### **Backend Technologies**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | 5.1.0 | Web server framework |
| **WebSocket (ws)** | 8.18.3 | Real-time communication |
| **Firebase Admin SDK** | 13.5.0 | Backend Firebase integration |
| **JWT** | 9.0.2 | Authentication tokens |
| **bcryptjs** | 3.0.2 | Password hashing |
| **Joi** | 17.11.0 | Data validation |
| **Stripe** | 14.0.0 | Payment processing |
| **Nodemailer** | 6.9.11 | Email sending |

### **Database & Storage**
| Service | Purpose |
|---------|---------|
| **Firebase Firestore** | Real-time NoSQL database |
| **Firebase Authentication** | User authentication |
| **Firebase Cloud Storage** | File storage (PDFs, images, videos) |
| **Firebase Hosting** | Static site hosting |

### **Real-Time Features**
- **WebSocket Server** (`ws` library) - Real-time notifications
- **Firebase Firestore** - Real-time database updates
- **Firebase Cloud Messaging** - Push notifications

---

## 🌐 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production Setup                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (React + Vite)                                │
│  ├─ Firebase Hosting (Static Files)                    │
│  └─ CDN Distribution                                    │
│                                                         │
│  Backend (Node.js + Express)                           │
│  ├─ VPS/Cloud Server (Railway, Render, Heroku)        │
│  ├─ WebSocket Server (Port 5000)                       │
│  └─ API Endpoints (/api/*)                             │
│                                                         │
│  Database & Services                                    │
│  ├─ Firebase Firestore (Real-time DB)                  │
│  ├─ Firebase Storage (Files)                           │
│  └─ Firebase Auth (Users)                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Options

### **Option 1: Firebase Hosting + Cloud Run (Recommended)**

**Best for:** Scalable, serverless architecture

#### **Frontend Deployment:**
```bash
# 1. Build frontend
npm install
npm run build:prod

# 2. Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### **Backend Deployment (Cloud Run):**
```bash
# 1. Create Dockerfile in backend/
cat > backend/Dockerfile << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
EOF

# 2. Deploy to Cloud Run
gcloud run deploy digidiploma-api \
  --source ./backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000
```

**Environment Variables in Cloud Run:**
- Set all `.env` variables in Cloud Run console
- Firebase credentials
- JWT_SECRET
- PORT=5000

---

### **Option 2: Vercel (Frontend) + Railway/Render (Backend)**

**Best for:** Easy deployment with GitHub integration

#### **Frontend to Vercel:**
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Configure environment variables in Vercel dashboard
```

**Vercel Environment Variables:**
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_API_URL=https://your-backend-url.com
```

#### **Backend to Railway:**
```bash
# 1. Connect GitHub repo to Railway
# 2. Set root directory to: backend/
# 3. Set build command: npm install
# 4. Set start command: node server.js
# 5. Add environment variables
```

**Railway Environment Variables:**
```env
PORT=5000
NODE_ENV=production
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=xxx
JWT_SECRET=xxx
FRONTEND_URL=https://your-frontend-url.vercel.app
```

---

### **Option 3: Traditional VPS (DigitalOcean, AWS EC2, etc.)**

**Best for:** Full control, custom configuration

#### **Server Setup:**
```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 (Process Manager)
sudo npm install -g pm2

# 4. Install Nginx
sudo apt install -y nginx

# 5. Clone repository
git clone https://github.com/your-repo/digidiploma.git
cd digidiploma

# 6. Install dependencies
npm install
cd backend && npm install

# 7. Build frontend
cd .. && npm run build:prod

# 8. Create .env file in backend/
cd backend
nano .env
# Add all environment variables

# 9. Start backend with PM2
pm2 start server.js --name digidiploma-api
pm2 startup
pm2 save

# 10. Configure Nginx
sudo nano /etc/nginx/sites-available/digidiploma
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React App)
    location / {
        root /path/to/digidiploma/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Static files
    location /uploads {
        proxy_pass http://localhost:5000;
    }
}

# Enable SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 Environment Variables Setup

### **Backend `.env` File:**
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

# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **Frontend Environment Variables:**
Create `.env.production` in root:
```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=https://your-backend-domain.com
VITE_WS_URL=wss://your-backend-domain.com
```

---

## 🔄 Real-Time Configuration

### **WebSocket Setup:**

The project uses WebSocket for real-time features. Ensure your deployment supports WebSocket:

1. **Update Frontend WebSocket URL:**
   ```typescript
   // src/hooks/useWebSocket.ts
   const wsUrl = import.meta.env.VITE_WS_URL || 
     `ws://localhost:5000`; // Development
     // `wss://your-backend-domain.com`; // Production
   ```

2. **Backend WebSocket Server:**
   - Already configured in `backend/websocket.js`
   - Runs on same port as Express server (5000)
   - Handles authentication via JWT tokens

3. **Nginx WebSocket Configuration:**
   ```nginx
   location /ws {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

---

## 📦 Firebase Setup Steps

### **1. Create Firebase Project:**
```bash
# Login to Firebase
firebase login

# Create project
firebase projects:create digidiploma-prod

# Initialize Firebase
firebase init
```

### **2. Enable Firebase Services:**
- ✅ Firestore Database
- ✅ Authentication (Email/Password)
- ✅ Cloud Storage
- ✅ Cloud Messaging
- ✅ Hosting
- ✅ Analytics

### **3. Get Firebase Admin SDK Credentials:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. Extract values to `.env` file

### **4. Configure Firestore Security Rules:**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /materials/{materialId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'admin';
    }
    
    match /courses/{courseId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'admin';
    }
    
    match /projects/{projectId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### **5. Configure Storage Rules:**
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /materials/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.userType == 'admin';
    }
    
    match /uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🔐 Security Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set up Firestore security rules
- [ ] Configure Storage security rules
- [ ] Enable rate limiting
- [ ] Use environment variables (never commit secrets)
- [ ] Enable Firebase App Check
- [ ] Set up proper error logging
- [ ] Configure backup strategy

---

## 📊 Monitoring & Maintenance

### **1. Firebase Console:**
- Monitor Firestore usage
- Check authentication logs
- Review storage usage
- Monitor Cloud Functions (if used)

### **2. Application Monitoring:**
```bash
# PM2 Monitoring (if using VPS)
pm2 monit

# Check logs
pm2 logs digidiploma-api

# Restart on crash
pm2 start server.js --name digidiploma-api --watch
```

### **3. Uptime Monitoring:**
- Use UptimeRobot or Pingdom
- Monitor API endpoints: `/api/health`
- Set up alerts for downtime

---

## 🚨 Troubleshooting

### **WebSocket Not Connecting:**
1. Check firewall allows WebSocket connections
2. Verify Nginx/proxy configuration
3. Check backend logs for WebSocket errors
4. Ensure JWT tokens are valid

### **Firebase Connection Issues:**
1. Verify Firebase credentials in `.env`
2. Check Firestore security rules
3. Verify Firebase project ID matches
4. Check Firebase quotas/limits

### **File Upload Issues:**
1. Check Firebase Storage rules
2. Verify file size limits
3. Check backend `/uploads` directory permissions
4. Verify CORS configuration

---

## 📈 Performance Optimization

### **Frontend:**
- Enable gzip compression
- Use CDN for static assets
- Implement lazy loading
- Optimize images (WebP format)
- Enable service worker caching

### **Backend:**
- Use Redis for caching (optional)
- Implement database indexing
- Use connection pooling
- Monitor API response times
- Optimize Firestore queries

---

## 🎯 Quick Start Deployment (Recommended: Railway + Vercel)

### **Step 1: Deploy Backend to Railway**
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repository
4. Set root directory: `backend`
5. Add environment variables
6. Deploy!

### **Step 2: Deploy Frontend to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Set build command: `npm run build:prod`
4. Set output directory: `dist`
5. Add environment variables
6. Deploy!

### **Step 3: Update Frontend API URL**
Update `VITE_API_URL` in Vercel to point to Railway backend URL.

---

## ✅ Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test user login
- [ ] Test file uploads
- [ ] Test real-time notifications
- [ ] Test WebSocket connections
- [ ] Test payment processing (if enabled)
- [ ] Verify SSL certificate
- [ ] Test on mobile devices
- [ ] Check Firebase quotas
- [ ] Set up monitoring alerts

---

**🎉 Your DigiDiploma platform is now live with full real-time functionality!**

For support, check:
- Firebase Console logs
- Backend server logs
- Browser console for frontend errors
- Network tab for API issues

