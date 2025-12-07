# Security Guide - Token Management

## ⚠️ The Problem

If you hardcode tokens in `.env` and share the repo, anyone who gets the `.env` file has **full access** to your:
- Discord bot
- GitHub repositories
- Your account credentials

## ✅ The Solution

This app now uses **encrypted token storage** so users can safely submit credentials:

1. **Tokens are encrypted** at rest in the SQLite database
2. **Tokens are never logged** or displayed
3. **Each user gets a unique webhookId** to identify their setup
4. **Tokens are only decrypted** when needed for API calls

---

## 🔐 How It Works

### Setup Flow

```
User submits credentials via API
    ↓
POST /api/setup with Discord & GitHub tokens
    ↓
Tokens are ENCRYPTED using AES-256-CBC
    ↓
Stored in encrypted form in SQLite database
    ↓
User receives webhookId (NOT the tokens)
    ↓
User configures GitHub webhook with webhookId
```

### Usage Flow

```
GitHub sends webhook event
    ↓
/webhook/:webhookId endpoint receives it
    ↓
App looks up setup by webhookId
    ↓
App DECRYPTS tokens from database
    ↓
Uses decrypted tokens to make API calls
    ↓
Tokens never stored in memory long-term
    ↓
Response sent to Discord
```

---

## 📝 API Endpoints

### 1. Create New Setup

**Request:**
```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "discordToken": "MTQ0NzEwMDU5NzAwOTUxODY3NQ.Gp9a45...",
    "discordClientId": "1447100597009518675",
    "discordGuildId": "1447102422379135026",
    "discordChannelId": "1447102422811021458",
    "githubToken": "github_pat_11A7NSBRY0tZUiPAzpb85i_...",
    "githubOwner": "paws1234",
    "githubRepo": "Webscrapper"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Setup created successfully! Your tokens are encrypted and secure.",
  "setup": {
    "id": "setup_a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "webhookId": "x1y2z3a4-b5c6-d7e8-f9g0-h1i2j3k4l5m6",
    "repo": "paws1234/Webscrapper",
    "discordGuild": "1447102422379135026"
  },
  "nextSteps": {
    "step1": "Copy your webhookId",
    "step2": "Go to GitHub repo settings → Webhooks",
    "step3": "Create webhook with payload URL:",
    "payloadUrl": "https://your-domain.com/webhook/x1y2z3a4-b5c6-d7e8-f9g0-h1i2j3k4l5m6",
    "contentType": "application/json",
    "events": ["pull_requests", "pushes"]
  }
}
```

⚠️ **IMPORTANT:** Save the `webhookId` - you'll never see the tokens again!

---

### 2. List All Setups

**Request:**
```bash
curl http://localhost:3000/api/setups
```

**Response:**
```json
{
  "count": 2,
  "setups": [
    {
      "id": "setup_a1b2c3d4-...",
      "webhookId": "x1y2z3a4-...",
      "githubOwner": "paws1234",
      "githubRepo": "Webscrapper",
      "discordGuildId": "1447102422379135026",
      "createdAt": "2025-12-07T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Setup Details

**Request:**
```bash
curl http://localhost:3000/api/setup/setup_a1b2c3d4-...
```

**Response:**
```json
{
  "id": "setup_a1b2c3d4-...",
  "webhookId": "x1y2z3a4-...",
  "repo": "paws1234/Webscrapper",
  "discordGuild": "1447102422379135026",
  "createdAt": "2025-12-07T10:30:00.000Z"
}
```

---

### 4. Delete Setup

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/setup/setup_a1b2c3d4-...
```

**Response:**
```json
{
  "success": true,
  "message": "Setup disabled successfully"
}
```

---

## 🔑 Encryption Details

### Algorithm
- **Cipher:** AES-256-CBC
- **IV:** 16-byte random for each encryption
- **Format:** `{iv}:{encrypted}`

### Storage
Tokens stored as: `iv_hex:encrypted_hex`

Example encrypted token:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9...
```

### Key Management

**⚠️ CRITICAL:** The encryption key must be protected:

```javascript
// Generate strong key (one-time, save it securely)
const key = crypto.randomBytes(32).toString('hex');

// Set in environment
process.env.ENCRYPTION_KEY = key;
```

**Best Practices:**
1. ✅ Store `ENCRYPTION_KEY` in environment variable
2. ✅ Use secret management service (AWS Secrets Manager, HashiCorp Vault, etc.)
3. ✅ Rotate keys periodically
4. ✅ Never commit `ENCRYPTION_KEY` to git
5. ❌ Don't use weak or hardcoded keys

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set strong `ENCRYPTION_KEY` environment variable
- [ ] Enable HTTPS (webhooks should use HTTPS only)
- [ ] Use strong database password/security
- [ ] Enable database backups
- [ ] Monitor for unauthorized access attempts
- [ ] Audit logs for setup creation/deletion
- [ ] Add rate limiting to `/api/setup`
- [ ] Add authentication to `/api/setups` (optional)
- [ ] Keep dependencies updated

---

## 📊 Database Schema

### setups table

```sql
CREATE TABLE setups (
  id TEXT PRIMARY KEY,                    -- Unique setup ID
  webhookId TEXT UNIQUE NOT NULL,        -- For GitHub webhook URL
  discordToken TEXT NOT NULL,            -- Encrypted
  discordClientId TEXT NOT NULL,         -- Plain (not sensitive)
  discordGuildId TEXT NOT NULL,          -- Plain (not sensitive)
  discordChannelId TEXT NOT NULL,        -- Plain (not sensitive)
  githubToken TEXT NOT NULL,             -- Encrypted
  githubOwner TEXT NOT NULL,             -- Plain (not sensitive)
  githubRepo TEXT NOT NULL,              -- Plain (not sensitive)
  isActive BOOLEAN DEFAULT 1,            -- Soft delete flag
  createdAt DATETIME,                    -- Setup creation time
  updatedAt DATETIME                     -- Last update time
);
```

---

## 🔒 What's Protected vs What's Not

| Data | Encrypted | Reason |
|------|-----------|--------|
| `discordToken` | ✅ YES | Full bot access |
| `githubToken` | ✅ YES | Full repo access |
| `discordClientId` | ❌ NO | Public, used in OAuth |
| `discordGuildId` | ❌ NO | Public, visible in Discord |
| `discordChannelId` | ❌ NO | Public, visible in Discord |
| `githubOwner` | ❌ NO | Public, visible on GitHub |
| `githubRepo` | ❌ NO | Public, visible on GitHub |

---

## ⚠️ Token Handling Best Practices

### ✅ DO:
- Use environment variables for `ENCRYPTION_KEY`
- Rotate tokens periodically
- Monitor token usage logs
- Use GitHub fine-grained tokens (more control)
- Enable Discord bot permissions limiting
- Use HTTPS for all connections
- Validate token format before storing

### ❌ DON'T:
- Hardcode tokens in source code
- Log tokens anywhere
- Send tokens in plain text
- Store unencrypted in database
- Use weak encryption keys
- Share webhook URLs publicly
- Commit `.env` files to git

---

## 🐛 Troubleshooting

### Tokens not decrypting?
- Check `ENCRYPTION_KEY` is set correctly
- Verify database file exists
- Check encryption format in database

### Setup creation fails?
- Validate token formats
- Check required fields are provided
- Verify database write permissions

### Webhook not working?
- Confirm `webhookId` matches database
- Check Discord bot has channel access
- Verify GitHub token has repo permissions

---

## 📚 Related Files

- `src/db.js` - Database and encryption module
- `src/setupRouter.js` - API endpoint handlers
- `.env` - Contains `ENCRYPTION_KEY`
- `data/setups.db` - SQLite database (generated)

---

## 🎯 Summary

This system allows **users to safely submit credentials without exposing them**:

1. Tokens encrypted with AES-256-CBC
2. Stored encrypted in database
3. Never displayed or logged
4. Decrypted only when needed
5. Each user gets unique webhookId
6. Tokens deleted when setup is disabled

**Result:** You can share the app and users can safely add their own tokens! 🔐
