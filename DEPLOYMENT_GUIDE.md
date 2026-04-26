# Fillica AI Desktop App - Deployment Guide

## What You Need to Deploy

### 1. Backend (Express.js Server)
**Must be deployed** - The desktop app needs this for:
- User authentication (Google OAuth)
- Storing user profiles and job data
- AI API key management
- Resume storage (AWS S3)

**Deployment Options:**
- Vercel (recommended for simplicity)
- Railway
- Render
- AWS/Heroku
- DigitalOcean

### 2. Database (MongoDB)
**Must be deployed** - Store user data, jobs, profiles
- MongoDB Atlas (cloud) - FREE tier available
- Or any MongoDB-compatible database

### 3. File Storage (AWS S3)
**Must be deployed** - Store user resumes
- AWS S3 bucket
- Or alternatives: Cloudflare R2, DigitalOcean Spaces

## Environment Variables to Set

### For Desktop App (.env.local)
```bash
# Point to your DEPLOYED backend URL
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
REACT_APP_BACKEND_URL=https://your-backend-domain.com
NODE_ENV=production
```

### For Backend (.env)
```bash
# Database
MONGO_URL=mongodb+srv://...

# Security
SESSION_SECRET=your-random-session-secret
JWT_SECRET=your-random-jwt-secret

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# URLs
BACKEND_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## Deployment Steps

### Step 1: Deploy Backend
1. Create account on Vercel/Railway/etc.
2. Connect your GitHub repo
3. Set environment variables in deployment platform
4. Deploy

### Step 2: Set Up Database
1. Create MongoDB Atlas account
2. Create cluster and database
3. Get connection string
4. Update MONGO_URL in backend env vars

### Step 3: Set Up S3
1. Create AWS account
2. Create S3 bucket
3. Create IAM user with S3 permissions
4. Get access keys
5. Update AWS env vars

### Step 4: Update Desktop App
1. Change .env.local to point to deployed backend
2. Rebuild desktop app: `npm run dist:mac`

## What Users DON'T Need to Run

✅ **No backend server** - Users don't run `npm run dev` in backend
✅ **No database** - MongoDB is cloud-hosted
✅ **No file storage** - S3 handles resumes
✅ **No AI keys** - Users set their own in the app

## What Users DO Need

✅ **Just the desktop app** (.dmg/.exe file)
✅ **Internet connection** (for API calls)
✅ **Their own AI API keys** (set in app profile)

## Testing Deployment

1. Deploy backend to production URL
2. Update .env.local with production URL
3. Rebuild: `npm run dist:mac`
4. Test the .dmg file on a clean machine
5. Verify login and automation work

## Cost Estimate

- **MongoDB Atlas**: FREE (first 512MB)
- **AWS S3**: ~$0.02/GB/month
- **Vercel**: FREE tier, then $20/month
- **Google OAuth**: FREE
- **AI APIs**: Pay per use (users pay their own)

Total: ~$20/month for small scale