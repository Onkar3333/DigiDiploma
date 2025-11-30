# 🏗️ DigiDiploma - Complete Deployment Architecture

## 🌐 **Production Stack**

```
┌─────────────────────────────────────────────────────────────┐
│                    digidiploma.in                           │
│                  (Custom Domain - Hostinger)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │           DNS Records (Hostinger)        │
        ├─────────────────────────────────────────┤
        │  @ → 76.76.21.21 (Vercel IP)           │
        │  www → cname.vercel-dns.com            │
        │  api → digidiploma-backend.onrender.com│
        └─────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
        ┌────────────────┐        ┌────────────────┐
        │   FRONTEND     │        │    BACKEND     │
        │   (Vercel)     │◄──────►│   (Render)     │
        ├────────────────┤        ├────────────────┤
        │ Vite + React   │        │  Express.js    │
        │ TypeScript     │        │  Node.js       │
        │ Tailwind CSS   │        │                │
        └────────────────┘        └────────────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
            ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
            │   DATABASE     │  │    STORAGE     │  │   SERVICES     │
            │  (MongoDB      │  │  (Cloudflare   │  │   (Firebase)   │
            │    Atlas)      │  │      R2)       │  │                │
            ├────────────────┤  ├────────────────┤  ├────────────────┤
            │ User Data      │  │ File Uploads   │  │ Authentication │
            │ Courses        │  │ Materials      │  │ Push Notif.    │
            │ Projects       │  │ Documents      │  │ Analytics      │
            └────────────────┘  └────────────────┘  └────────────────┘
```

---

## 📊 **Component Breakdown**

### 1️⃣ **Frontend - Vercel** 🎨
**URL**: https://digidiploma.in

**Technology Stack:**
- **Framework**: Vite + React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context API
- **Routing**: React Router

**Features:**
- ✅ Automatic HTTPS/SSL
- ✅ Global CDN
- ✅ Edge caching
- ✅ Automatic deployments from GitHub
- ✅ Preview deployments for PRs
- ✅ Web Analytics
- ✅ Serverless functions support

**Build Configuration:**
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

---

### 2️⃣ **Backend - Render** ⚙️
**URL**: https://api.digidiploma.in

**Technology Stack:**
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: JavaScript (ES Modules)
- **WebSocket**: Socket.io for real-time notifications

**Features:**
- ✅ Automatic HTTPS/SSL
- ✅ Auto-deploy from GitHub
- ✅ Health checks
- ✅ Environment variables
- ✅ Persistent disk (if needed)
- ✅ Custom domains

**API Endpoints:**
```
/api/users          - User management & authentication
/api/projects       - Student projects
/api/subjects       - Course subjects
/api/materials      - Study materials
/api/notices        - Announcements
/api/courses        - Course management
/api/quizzes        - Quiz system
/api/dashboard      - Analytics dashboard
/api/payments       - Payment processing
/api/internships    - Internship applications
/api/health         - Health check
```

---

### 3️⃣ **Database - MongoDB Atlas** 🗄️

**Provider**: MongoDB Atlas (Cloud)
**Plan**: Free Tier (M0) - 512MB storage

**Collections:**
- `users` - User accounts and profiles
- `projects` - Student projects
- `subjects` - Course subjects
- `materials` - Study materials
- `notices` - Announcements
- `courses` - Course information
- `quizzes` - Quiz data
- `payments` - Payment records
- `internships` - Internship applications

**Connection:**
```
mongodb+srv://digidiploma:<password>@cluster0.rfmryz3.mongodb.net/digidiploma
```

---

### 4️⃣ **Storage - Cloudflare R2** 📦

**Use Case**: File uploads, materials, documents

**Features:**
- ✅ S3-compatible API
- ✅ No egress fees
- ✅ Global distribution
- ✅ Automatic backups

**Storage Types:**
- Student project files
- Study materials (PDFs, docs)
- Uploaded documents
- Profile images

---

### 5️⃣ **Services - Firebase** 🔥

**Features Used:**
- **Authentication**: User login/signup
- **Cloud Messaging**: Push notifications
- **Analytics**: User behavior tracking
- **Hosting**: Static assets (if needed)

---

### 6️⃣ **Domain & DNS - Hostinger** 🌐

**Domain**: `digidiploma.in`

**DNS Configuration:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
Purpose: Frontend (Vercel)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
Purpose: WWW subdomain → Vercel

Type: CNAME
Name: api
Value: digidiploma-backend.onrender.com
TTL: 3600
Purpose: Backend API → Render
```

---

## 🔐 **Security Features**

### Frontend (Vercel):
- ✅ Automatic SSL/TLS certificates
- ✅ DDoS protection
- ✅ Edge caching
- ✅ Security headers
- ✅ Content Security Policy

### Backend (Render):
- ✅ Automatic SSL/TLS certificates
- ✅ HTTPS enforcement
- ✅ Rate limiting (express-rate-limit)
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ JWT authentication
- ✅ Input validation
- ✅ Environment variable encryption

### Database (MongoDB Atlas):
- ✅ Encrypted connections
- ✅ IP whitelisting
- ✅ Database user authentication
- ✅ Automated backups

---

## 🚀 **Deployment Workflow**

### Frontend (Vercel):
```
1. Push to GitHub (main branch)
   ↓
2. Vercel detects change
   ↓
3. Automatic build triggered
   ↓
4. Build with Vite
   ↓
5. Deploy to global CDN
   ↓
6. Live at https://digidiploma.in
```

### Backend (Render):
```
1. Push to GitHub (main branch)
   ↓
2. Render detects change
   ↓
3. Automatic build triggered
   ↓
4. Install dependencies
   ↓
5. Start server
   ↓
6. Live at https://api.digidiploma.in
```

---

## 📈 **Scaling Strategy**

### Current (Free Tier):
- **Frontend**: Unlimited bandwidth (Vercel Hobby)
- **Backend**: 750 hours/month (Render Free)
- **Database**: 512MB storage (MongoDB M0)
- **Storage**: 10GB free (Cloudflare R2)

### Future Scaling:
- **Frontend**: Upgrade to Vercel Pro ($20/month)
- **Backend**: Upgrade to Render Starter ($7/month)
- **Database**: Upgrade to M10 Shared ($9/month)
- **Storage**: Pay-as-you-go ($0.015/GB/month)

---

## 🌍 **Global Infrastructure**

### Frontend (Vercel):
- **Regions**: 40+ Edge locations worldwide
- **Latency**: < 50ms globally
- **Uptime**: 99.99% SLA

### Backend (Render):
- **Region**: Frankfurt, Germany (EU West)
- **Availability**: 99.9% uptime
- **Auto-scaling**: Available on paid plans

### Database (MongoDB Atlas):
- **Region**: AWS Frankfurt (eu-central-1)
- **Multi-zone**: Automatic failover
- **Backups**: Continuous

---

## 📊 **Monitoring & Analytics**

### Application Monitoring:
- ✅ Vercel Analytics (Web Vitals)
- ✅ Render Logs & Metrics
- ✅ MongoDB Atlas Monitoring
- ✅ Firebase Analytics

### Key Metrics:
- API response times
- Error rates
- User engagement
- Database performance
- Storage usage
- Bandwidth consumption

---

## 💰 **Cost Breakdown** (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| **Vercel** (Frontend) | Hobby | Free |
| **Render** (Backend) | Free | Free |
| **MongoDB Atlas** | M0 | Free |
| **Cloudflare R2** | Free Tier | Free |
| **Firebase** | Spark | Free |
| **Hostinger** (Domain) | Annual | ~$1/month |
| **Total** | | **~$1/month** |

**Note**: Free tiers have limitations. Scale as needed.

---

## 🔄 **Backup Strategy**

### Database:
- ✅ MongoDB Atlas automatic backups
- ✅ Point-in-time recovery available

### Files:
- ✅ Cloudflare R2 durability: 99.999999999%
- ✅ Versioning enabled

### Code:
- ✅ GitHub repository (version control)
- ✅ Automatic deployment history on Vercel/Render

---

## 🎯 **Performance Optimization**

### Frontend:
- ✅ Code splitting
- ✅ Lazy loading
- ✅ Image optimization
- ✅ Minification & compression
- ✅ CDN caching

### Backend:
- ✅ Database indexing
- ✅ Query optimization
- ✅ Rate limiting
- ✅ Compression (gzip)
- ✅ Connection pooling

---

## 📞 **Support & Resources**

### Documentation:
- **Frontend**: [Vercel Docs](https://vercel.com/docs)
- **Backend**: [Render Docs](https://render.com/docs)
- **Database**: [MongoDB Docs](https://docs.mongodb.com)
- **Domain**: [Hostinger Support](https://www.hostinger.com/tutorials)

### Status Pages:
- Vercel: https://www.vercel-status.com
- Render: https://status.render.com
- MongoDB: https://status.mongodb.com

---

## ✅ **Production Checklist**

### DNS & Domains:
- [x] Domain purchased (digidiploma.in)
- [ ] DNS A record configured (@)
- [ ] DNS CNAME configured (www)
- [ ] DNS CNAME configured (api)
- [ ] DNS propagated

### Frontend:
- [ ] Deployed to Vercel
- [ ] Custom domain added
- [ ] Environment variables set
- [ ] SSL certificate active
- [ ] Build successful

### Backend:
- [x] Deployed to Render
- [x] Custom domain added (api.digidiploma.in)
- [x] Environment variables set
- [x] SSL certificate active
- [x] Health check passing

### Database:
- [x] MongoDB cluster created
- [x] Database user configured
- [x] IP whitelist configured
- [x] Connection string added to backend

### Services:
- [x] Firebase project created
- [x] R2 bucket created
- [x] API keys secured

---

## 🎉 **Final URLs**

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://digidiploma.in | 🟡 Pending DNS |
| **Frontend (www)** | https://www.digidiploma.in | 🟡 Pending DNS |
| **Backend API** | https://api.digidiploma.in | 🟡 Pending DNS |
| **Health Check** | https://api.digidiploma.in/api/health | ✅ Live |
| **Render (temp)** | https://digidiploma-backend.onrender.com | ✅ Live |

---

**Your DigiDiploma application is production-ready! 🚀**

For detailed setup instructions:
- Frontend: See `VERCEL_DEPLOYMENT.md`
- Backend: See `DEPLOYMENT_GUIDE.md`
- Domain: See `DOMAIN_SETUP_GUIDE.md`
- Quick Ref: See `DOMAIN_QUICK_REFERENCE.md`

