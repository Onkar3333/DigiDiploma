# 🚀 DigiDiploma - Domain Quick Reference

## 🌐 Your URLs

### Production
- **Website**: https://digidiploma.in
- **API**: https://api.digidiploma.in
- **Health Check**: https://api.digidiploma.in/api/health

### Development
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

---

## 📋 DNS Records (Hostinger)

### Backend API
```
Type: CNAME
Name: api
Value: digidiploma-backend.onrender.com
```

### Frontend (if on Render)
```
Type: CNAME
Name: www
Value: your-frontend-app.onrender.com

Type: A
Name: @
Value: [Render's IP]
```

---

## 🔧 Render Configuration

### Backend Service
**Custom Domain**: `api.digidiploma.in`

**Environment Variables:**
```
FRONTEND_URL=https://digidiploma.in
API_URL=https://api.digidiploma.in
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
```

### Frontend Service (if applicable)
**Custom Domains**: 
- `digidiploma.in`
- `www.digidiploma.in`

**Environment Variables:**
```
VITE_API_URL=https://api.digidiploma.in
VITE_BACKEND_URL=https://api.digidiploma.in
```

---

## ✅ Quick Test Commands

```bash
# Test API
curl https://api.digidiploma.in/api/health

# Check DNS
nslookup api.digidiploma.in

# Check SSL
curl -I https://api.digidiploma.in
```

---

## 🔍 Status Check

- [ ] DNS records added on Hostinger
- [ ] DNS propagated (30min - 48hrs)
- [ ] Custom domain added on Render
- [ ] SSL certificate active
- [ ] Environment variables updated
- [ ] Frontend deployed
- [ ] Backend accessible
- [ ] HTTPS working

---

## 📞 Important Links

- **Hostinger Dashboard**: https://hpanel.hostinger.com
- **Render Dashboard**: https://dashboard.render.com
- **DNS Checker**: https://dnschecker.org
- **GitHub Repo**: https://github.com/digidiploma06/DigiDiploma

---

## ⚡ Common Issues

### CORS Error
✅ Already configured for digidiploma.in

### DNS Not Resolving
⏱️ Wait 30 mins - 48 hours

### SSL Not Working
⏱️ Wait 10-30 mins after adding custom domain

---

**Last Updated**: December 2024

