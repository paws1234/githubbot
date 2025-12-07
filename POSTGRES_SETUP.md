# PostgreSQL Setup for Render (Free Plan)

## Why PostgreSQL?

Render's **free plan doesn't support persistent disks**, so SQLite data gets lost on redeploys. PostgreSQL solves this:
- ✅ Data persists across redeploys
- ✅ Free tier available on Render
- ✅ Encrypted tokens still stored safely

## 📋 Setup Steps

### Step 1: Create PostgreSQL Database on Render

1. Go to [render.com](https://render.com)
2. Click **New +** → **PostgreSQL**
3. Fill in:
   - **Name**: `github-discord-automation-db`
   - **Database**: `setups`
   - **User**: `postgres` (default)
   - **Region**: Same as your web service
   - **Plan**: Free
4. Click **Create Database**

### Step 2: Get Connection String

After database is created:
1. Copy the **External Database URL** (looks like: `postgresql://user:pass@host:5432/db`)
2. Keep this safe - you'll need it in Step 4

### Step 3: Update Your Web Service Environment

1. Go to your web service: `github-discord-automation`
2. Click **Environment** tab
3. Add new variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the connection string from Step 2

### Step 4: Update Your Code

Your code is already updated to use PostgreSQL! Just make sure:

```bash
npm install
git add .
git commit -m "Switch to PostgreSQL for Render free plan"
git push
```

Render will auto-redeploy with the new database URL.

### Step 5: Deploy

1. Render auto-detects the push
2. Build takes 2-3 minutes
3. Your data now persists! ✅

## 🧪 Test It

```bash
# List setups (should be empty)
curl https://your-app.onrender.com/api/setups

# Create setup
curl -X POST https://your-app.onrender.com/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "discordToken": "YOUR_TOKEN",
    "discordClientId": "...",
    "discordGuildId": "...",
    "discordChannelId": "...",
    "githubToken": "ghp_...",
    "githubOwner": "your_username",
    "githubRepo": "your_repo"
  }'

# Redeploy your service
# (Manual Deploy button in Render)

# List setups again
curl https://your-app.onrender.com/api/setups
# Should still show your setup! ✅
```

## 🔍 View Database in Render

In Render dashboard:
1. Click on your PostgreSQL database
2. Scroll down → **Connect** button
3. Use psql to connect:
   ```bash
   psql postgresql://user:pass@host:5432/db
   
   # List tables
   \dt
   
   # View setups
   SELECT id, webhookId, githubOwner, githubRepo FROM setups;
   ```

## ⚠️ Important Notes

- **DATABASE_URL must be set** in Render environment
- **ENCRYPTION_KEY must be set** (your 64-char hex string)
- Free PostgreSQL DB is limited to 90 days, but **auto-extends** if accessed monthly
- Free tier: 256MB storage (plenty for encrypted tokens)

## 🚀 Result

Your data now survives redeploys! Perfect for free Render tier! 🎉
