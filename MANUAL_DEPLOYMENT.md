# Manual Deployment Guide for DraftTeam VPS

## 🚀 Quick Manual Deployment

**Use this guide when auto-deployment fails or you need to deploy manually.**

---

## 📋 Prerequisites

### Required Information:
- **VPS IP Address:** Your Contabo VPS IP
- **SSH Username:** Usually `root`
- **SSH Key/Password:** Your VPS access credentials
- **Project Path:** `/var/www/drafteam`

### Required Tools:
- SSH client (Terminal, PuTTY, etc.)
- Git access to repository

---

## 🔧 Step-by-Step Manual Deployment

### Step 1: Connect to VPS
```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# If using SSH key:
ssh -i ~/.ssh/your-key root@YOUR_VPS_IP
```

### Step 2: Navigate to Project Directory
```bash
# Go to project folder
cd /var/www/drafteam

# Check current status
pwd
ls -la
```

### Step 3: Update Code from GitHub
```bash
# Fetch latest changes
git fetch origin

# Reset any local changes (CAUTION: This removes local modifications)
git reset --hard origin/main

# Pull latest code
git pull origin main

# Verify update
git log --oneline -5
```

### Step 4: Install Dependencies
```bash
# Install Node.js dependencies (server)
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Install frontend dependencies and build
cd client
npm ci
npm run build

# Verify build
ls -la build/

# Clean npm cache
npm cache clean --force

# Return to project root
cd ..
```

### Step 5: Restart Application
```bash
# Restart PM2 process
pm2 restart drafteam-server

# Check status
pm2 status

# View logs if needed
pm2 logs drafteam-server
```

### Step 6: Verify Deployment
```bash
# Check if server is running
pm2 status

# Test website (replace with your domain/IP)
curl -I http://YOUR_VPS_IP

# Check disk space
df -h

# Check memory usage
free -h
```

---

## 🚨 Troubleshooting Common Issues

### Issue 1: Git Pull Conflicts
```bash
# If git pull fails due to conflicts
git stash
git pull origin main
git stash pop

# Or force reset (CAUTION: Loses local changes)
git reset --hard origin/main
```

### Issue 2: NPM Install Fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Frontend Build Fails
```bash
# In client directory
cd client

# Clear cache and reinstall
rm -rf node_modules package-lock.json build
npm install
npm run build
```

### Issue 4: PM2 Issues
```bash
# Stop all PM2 processes
pm2 stop all

# Start fresh
pm2 start index.js --name "drafteam-server"

# Or reload PM2
pm2 reload all
```

### Issue 5: Python Dependencies
```bash
# Update pip
pip3 install --upgrade pip

# Install requirements
pip3 install -r requirements.txt

# If specific package fails
pip3 install package-name --force-reinstall
```

---

## 📊 Deployment Checklist

### Before Deployment:
- [ ] Backup current version (optional)
- [ ] Check VPS disk space: `df -h`
- [ ] Check VPS memory: `free -h`
- [ ] Verify SSH access to VPS

### During Deployment:
- [ ] SSH into VPS
- [ ] Navigate to `/var/www/drafteam`
- [ ] Update code from GitHub
- [ ] Install Node.js dependencies
- [ ] Install Python dependencies
- [ ] Build frontend
- [ ] Restart PM2 server

### After Deployment:
- [ ] Check PM2 status: `pm2 status`
- [ ] Test website accessibility
- [ ] Verify file uploads work
- [ ] Check OSM converter functionality
- [ ] Test authentication system
- [ ] Monitor logs: `pm2 logs`

---

## 🔄 Quick Commands Reference

### Essential Commands:
```bash
# Connect to VPS
ssh root@YOUR_VPS_IP

# Update code
cd /var/www/drafteam && git pull origin main

# Install dependencies
npm install && pip3 install -r requirements.txt

# Build frontend
cd client && npm ci && npm run build && cd ..

# Restart server
pm2 restart drafteam-server

# Check status
pm2 status
```

### 🤖 Auto-Deployment Command (Exact GitHub Actions Replica):
```bash
# This command replicates exactly what GitHub Actions does
ssh root@YOUR_VPS_IP "cd /var/www/drafteam && git fetch origin && git reset --hard origin/main && git pull origin main && cd client && npm ci && npm run build && ls -la build/ && npm cache clean --force && cd ../server && npm install && pip3 install -r ../requirements.txt && pm2 restart drafteam-server && echo 'Deployment completed at \$(date)'"
```

### One-Line Deployment (Advanced):
```bash
# Complete deployment in one command (use with caution)
cd /var/www/drafteam && git reset --hard origin/main && git pull origin main && npm install && pip3 install -r requirements.txt && cd client && npm ci && npm run build && cd .. && pm2 restart drafteam-server
```

---

## 🛡️ Safety Tips

### Before Major Updates:
1. **Backup current version:**
   ```bash
   cp -r /var/www/drafteam /var/www/drafteam-backup-$(date +%Y%m%d)
   ```

2. **Test in staging first** (if available)

3. **Check dependencies** for breaking changes

### During Deployment:
1. **Monitor logs** for errors
2. **Test immediately** after deployment
3. **Keep backup ready** for quick rollback

### Emergency Rollback:
```bash
# If deployment fails, rollback to previous version
cd /var/www/drafteam
git log --oneline -10  # Find previous commit
git reset --hard PREVIOUS_COMMIT_HASH
pm2 restart drafteam-server
```

---

## 📞 Support Information

### Key Files to Check:
- **Server logs:** `pm2 logs drafteam-server`
- **System logs:** `/var/log/syslog`
- **Nginx logs:** `/var/log/nginx/` (if using Nginx)
- **Application config:** `/var/www/drafteam/server/index.js`

### Common Log Locations:
- **PM2 logs:** `~/.pm2/logs/`
- **Application uploads:** `/var/www/drafteam/server/uploads/`
- **Frontend build:** `/var/www/drafteam/client/build/`

---

## 🎯 Success Indicators

### Deployment Successful When:
- ✅ `pm2 status` shows "online" status
- ✅ Website loads without errors
- ✅ File uploads work correctly
- ✅ Authentication system functional
- ✅ OSM converter operational
- ✅ All 46 projects visible
- ✅ No errors in `pm2 logs`

---

**📝 Note:** Keep this guide handy for emergency deployments or when auto-deployment is not working. Always test the deployment after completion to ensure everything is working correctly.

**🚀 For questions or issues, refer to the troubleshooting section or check the application logs for specific error messages.**