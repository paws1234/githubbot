# Deploy to Render with Docker

## ✅ What Changed

1. **Dockerfile**: Added sqlite3 build dependencies + `/data` directory
2. **docker-compose.yml**: Added persistent volume for database
3. **render.yaml**: Render deployment configuration

## 📋 Deploy Steps

### Step 1: Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output (64-character hex string)

### Step 2: Push to GitHub
```bash
git add .
git commit -m "Add Render Docker deployment"
git push origin main
```

### Step 3: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

### Step 4: Create Web Service
1. Click **New +** → **Web Service**
2. Select your repository
3. Fill in:
   - **Name**: `github-discord-automation`
   - **Runtime**: Docker
   - **Plan**: Free (or paid)

### Step 5: Add Environment Variables
Click **Advanced** → **Add Environment Variable** for each:

| Key | Value |
|-----|-------|
| `ENCRYPTION_KEY` | Paste the 64-char hex from Step 1 |
| `DISCORD_TOKEN` | Your Discord bot token |
| `GITHUB_TOKEN` | (Optional) GitHub token |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

**⚠️ IMPORTANT:** Do NOT commit sensitive values to git!

### Step 6: Add Persistent Disk
1. Go to **Disks** tab
2. Click **Add Disk**
   - **Name**: `data`
   - **Mount Path**: `/data`
   - **Size**: 1 GB (or more)

### Step 7: Deploy
1. Click **Deploy**
2. Wait for build to complete (2-3 minutes)
3. Get your URL: `https://your-app.onrender.com`

## 🧪 Test It Works

### Check Health
```bash
curl https://your-app.onrender.com/api/setups
```
Should return: `[]` (empty array)

### Submit a Token
```bash
curl -X POST https://your-app.onrender.com/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "discordToken": "your_discord_token",
    "discordClientId": "123456789",
    "discordGuildId": "987654321",
    "discordChannelId": "555555555",
    "githubToken": "ghp_xxxxxxxxxxxx",
    "githubOwner": "your_username",
    "githubRepo": "your_repo"
  }'
```

Should return:
```json
{
  "success": true,
  "setup": {
    "id": "setup_123",
    "webhookId": "abc-def-ghi",
    "githubOwner": "your_username",
    "githubRepo": "your_repo"
  }
}
```

### Get WebhookId
```bash
curl https://your-app.onrender.com/api/setups
```

Use the `webhookId` in your GitHub webhook URL:
```
https://your-app.onrender.com/webhook/{webhookId}
```

## 🔐 Security Checklist

- ✅ HTTPS automatic (Render provides free SSL)
- ✅ Environment variables encrypted at rest
- ✅ SQLite database encrypted with ENCRYPTION_KEY
- ✅ Persistent disk survives redeploys
- ✅ Tokens never in logs

## 🚀 Advanced: Auto-Deploy

To auto-redeploy on git push:

1. Go to **Settings** → **Auto-Deploy**
2. Select `main` branch
3. Choose: "Yes, auto-deploy on push"

Now every `git push` triggers a new build!

## 🆘 Troubleshooting

### Logs Not Working?
```bash
# View in Render dashboard:
# Service → Logs
# Watch real-time deployment
```

### Database Not Persisting?
- Check **Disks** tab → `/data` is mounted
- Disk must be 1GB+ (free plan limited)

### Tokens Not Encrypting?
- Verify `ENCRYPTION_KEY` is set (64-char hex)
- Check Render **Logs** for errors

### Port Issues?
- Render automatically assigns PORT
- Don't hardcode port in code
- Use `process.env.PORT || 3000`

## 📊 Free Plan Limits

- **Build time**: ~5 minutes (free plan slower)
- **Disk**: 1GB persistent storage
- **Memory**: 512MB
- **CPU**: Shared
- **Auto-sleep**: 15 min of inactivity (paid = always on)

Free plan works great for testing! Upgrade to paid if needed 24/7 uptime.

---

**Now your app is live on Render with encrypted tokens and persistent database!** 🎉
