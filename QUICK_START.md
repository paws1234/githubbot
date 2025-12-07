# Quick Start Guide - Secure Token Setup

## 🎯 Overview

Instead of hardcoding tokens in `.env`, users can now safely submit their credentials via API. Tokens are **encrypted and stored securely**.

---

## 🚀 Getting Started

### Step 1: Start the Server

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`

---

### Step 2: User Submits Credentials

Users send a POST request with their Discord and GitHub tokens:

```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "discordToken": "YOUR_DISCORD_BOT_TOKEN",
    "discordClientId": "YOUR_DISCORD_CLIENT_ID",
    "discordGuildId": "YOUR_DISCORD_GUILD_ID",
    "discordChannelId": "YOUR_DISCORD_CHANNEL_ID",
    "githubToken": "YOUR_GITHUB_PAT",
    "githubOwner": "your-username-or-org",
    "githubRepo": "your-repo"
  }'
```

### Step 3: Server Returns WebhookId

```json
{
  "success": true,
  "message": "Setup created successfully! Your tokens are encrypted and secure.",
  "setup": {
    "id": "setup_a1b2c3d4-...",
    "webhookId": "x1y2z3a4-...",
    "repo": "paws1234/Webscrapper",
    "discordGuild": "1447102422379135026"
  },
  "nextSteps": {
    "step1": "Copy your webhookId",
    "step2": "Go to GitHub repo settings → Webhooks",
    "step3": "Create webhook with payload URL:",
    "payloadUrl": "http://localhost:3000/webhook/x1y2z3a4-...",
    "contentType": "application/json",
    "events": ["pull_requests", "pushes"]
  }
}
```

### Step 4: Configure GitHub Webhook

1. Go to **GitHub Repo** → **Settings** → **Webhooks**
2. Click **Add webhook**
3. **Payload URL:** `http://your-domain.com/webhook/{webhookId}`
4. **Content type:** `application/json`
5. **Select events:** Check `Pull requests` and `Pushes`
6. Click **Add webhook**

---

## 📋 API Endpoints

### Create Setup
```
POST /api/setup
Content-Type: application/json

{
  "discordToken": "...",
  "discordClientId": "...",
  "discordGuildId": "...",
  "discordChannelId": "...",
  "githubToken": "...",
  "githubOwner": "...",
  "githubRepo": "..."
}
```

**Response:** `201 Created` with webhookId

---

### List All Setups
```
GET /api/setups
```

**Response:**
```json
{
  "count": 1,
  "setups": [
    {
      "id": "setup_...",
      "webhookId": "x1y2z3a4-...",
      "githubOwner": "paws1234",
      "githubRepo": "Webscrapper",
      "discordGuildId": "1447102422379135026",
      "createdAt": "2025-12-07T..."
    }
  ]
}
```

---

### Get Setup Details
```
GET /api/setup/{setupId}
```

**Response:** Setup info (no tokens)

---

### Delete Setup
```
DELETE /api/setup/{setupId}
```

**Response:**
```json
{
  "success": true,
  "message": "Setup disabled successfully"
}
```

---

## 🔐 Security Features

✅ **Encrypted Storage** - Tokens encrypted with AES-256-CBC
✅ **Never Logged** - Tokens never appear in logs
✅ **Unique WebhookId** - Each setup has unique identifier
✅ **Soft Delete** - Setups disabled, not permanently deleted
✅ **Format Validation** - Validates token formats before storing

---

## 📚 Example: Using from Python

```python
import requests

url = "http://localhost:3000/api/setup"
data = {
    "discordToken": "MTQ0NzEwMDU5Nzc...",
    "discordClientId": "1447100597009518675",
    "discordGuildId": "1447102422379135026",
    "discordChannelId": "1447102422811021458",
    "githubToken": "github_pat_11A7NSBRY0...",
    "githubOwner": "paws1234",
    "githubRepo": "Webscrapper"
}

response = requests.post(url, json=data)
result = response.json()

print(f"WebhookId: {result['setup']['webhookId']}")
print(f"Use this URL for GitHub: {result['nextSteps']['payloadUrl']}")
```

---

## 📞 Example: Using from JavaScript

```javascript
const axios = require('axios');

const setup = {
  discordToken: "MTQ0NzEwMDU5Nzc...",
  discordClientId: "1447100597009518675",
  discordGuildId: "1447102422379135026",
  discordChannelId: "1447102422811021458",
  githubToken: "github_pat_11A7NSBRY0...",
  githubOwner: "paws1234",
  githubRepo: "Webscrapper"
};

try {
  const response = await axios.post('http://localhost:3000/api/setup', setup);
  console.log('WebhookId:', response.data.setup.webhookId);
  console.log('Payload URL:', response.data.nextSteps.payloadUrl);
} catch (error) {
  console.error('Setup failed:', error.response.data);
}
```

---

## 🔄 Complete Workflow

```
1. User calls: POST /api/setup with credentials
2. Server encrypts tokens with AES-256-CBC
3. Stores encrypted tokens in SQLite database
4. Returns webhookId (NOT tokens)
5. User configures GitHub webhook with webhookId
6. GitHub sends events to: /webhook/{webhookId}
7. Server looks up encrypted tokens by webhookId
8. Decrypts tokens
9. Uses them to interact with GitHub API
10. Posts results to Discord
11. Never stores tokens in memory long-term
```

---

## ⚙️ Environment Variables

```bash
# Required
ENCRYPTION_KEY=your-strong-random-key-here

# Optional (for fallback if no setup)
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
DISCORD_CHANNEL_ID=...
GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...

# Port
PORT=3000
```

---

## 🚨 Important Notes

1. **Generate ENCRYPTION_KEY**: This is critical for security
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **HTTPS in Production**: Always use HTTPS for webhook URLs
3. **Backup Database**: Backup `data/setups.db` regularly
4. **Audit Logs**: Monitor setup creation/deletion
5. **Rate Limiting**: Consider adding rate limiting to `/api/setup`

---

## 🧪 Test the Setup

```bash
# Test health
curl http://localhost:3000/health

# Create setup
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{...}'

# List setups
curl http://localhost:3000/api/setups

# Get specific setup
curl http://localhost:3000/api/setup/setup_id_here

# Delete setup
curl -X DELETE http://localhost:3000/api/setup/setup_id_here
```

---

## 🎉 Result

Now users can:
- ✅ Safely submit their own tokens
- ✅ Never expose credentials in source code
- ✅ Have encrypted token storage
- ✅ Get unique webhookIds for GitHub
- ✅ Multiple users can use the same bot instance!

**You can now share this app with others safely!** 🚀
