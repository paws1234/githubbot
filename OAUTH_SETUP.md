# OAuth Setup Guide

This guide explains how to set up the GitHub Discord Bot using OAuth authentication.

## Overview

Instead of manually copying tokens, users can now use the OAuth flow to securely connect their GitHub and Discord accounts. This is more user-friendly and secure.

## Prerequisites

You need to create OAuth applications on both GitHub and Discord:

### 1. Create GitHub OAuth Application

1. Go to: https://github.com/settings/developers
2. Click **New OAuth App** → **New GitHub App** (choose based on your needs)
3. For **OAuth App**:
   - **Application name**: `GitHub Discord Bot` (or your preferred name)
   - **Homepage URL**: `https://your-domain.com` (your Render app URL)
   - **Authorization callback URL**: `https://your-domain.com/oauth/github/callback`
4. Copy the **Client ID** and **Client Secret**

### 2. Create Discord OAuth Application

1. Go to: https://discord.com/developers/applications
2. Click **New Application**
3. Go to **OAuth2** → **General**
4. Add **Redirect URL**: `https://your-domain.com/oauth/discord/callback`
5. Copy the **Client ID** and **Client Secret**

### 3. Set Environment Variables

Update your `.env` file on Render:

```env
# Discord OAuth
DISCORD_OAUTH_CLIENT_ID=your_client_id_here
DISCORD_OAUTH_CLIENT_SECRET=your_client_secret_here

# GitHub OAuth
GITHUB_OAUTH_CLIENT_ID=your_client_id_here
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret_here

# Discord Bot (for slash commands)
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_BOT_CLIENT_ID=your_bot_client_id_here

# Database & Encryption
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=your_64_char_hex_key_here

# Server
NODE_ENV=production
PORT=3000
```

## User Setup Flow

Users now go through this simple flow:

1. **Visit**: `https://your-domain.com/setup`
2. **Click "Connect GitHub"**
   - Redirected to GitHub to authorize
   - Selects which repositories to access
3. **Click "Connect Discord"**
   - Redirected to Discord to authorize
   - Selects which guilds to access
4. **Select Configuration**
   - Choose GitHub repository
   - Choose Discord server and channel
5. **Complete Setup**
   - Gets webhook URL for GitHub
   - Tokens encrypted and stored in database

## Technical Flow

### OAuth State Management

- State tokens are generated to prevent CSRF attacks
- States are stored temporarily in memory (upgrade to Redis in production)
- States expire after 10 minutes

### Token Encryption

- GitHub and Discord tokens are encrypted with AES-256-CBC
- Encryption key is 64-character hex string
- Each token has a random IV prepended
- Tokens are never logged or visible in API responses

### Session Management

- Users get a session ID after each OAuth step
- Session data stored temporarily in memory
- Sessions expire after 1 hour
- Database-backed storage recommended for production

## Security Considerations

1. **HTTPS Only**: OAuth must use HTTPS (enforced on Render)
2. **Token Encryption**: All tokens encrypted at rest in database
3. **State Validation**: CSRF protection via state parameter
4. **Minimal Scopes**: Only request necessary OAuth scopes
5. **Token Rotation**: Consider implementing token refresh flows
6. **No Hardcoding**: Never commit secrets to git

## Troubleshooting

### "Invalid state parameter"
- Session expired or tampered with
- Solution: Start setup over

### "OAuth credentials not configured"
- Environment variables not set
- Solution: Check Render Environment settings

### "Bad credentials"
- GitHub token invalid or revoked
- Solution: User needs to reconnect via OAuth

### CORS Errors
- Frontend and backend on different domains
- Solution: Verify redirects in OAuth apps

## Production Deployment

For production deployments:

1. **Use Redis** for OAuth state storage instead of in-memory Map
2. **Use Sessions** (connect-mongo or redis) instead of in-memory
3. **HTTPS** enforced (Render does this automatically)
4. **Rate Limiting** on OAuth endpoints
5. **Token Refresh** implement refresh_token flows for long-term access
6. **Audit Logging** log all OAuth events
7. **Error Handling** don't expose error details to users

## Example: Using with Render

1. Go to Render Dashboard
2. Select your service
3. Go to **Environment**
4. Add the OAuth credentials:
   ```
   DISCORD_OAUTH_CLIENT_ID=xxx
   DISCORD_OAUTH_CLIENT_SECRET=xxx
   GITHUB_OAUTH_CLIENT_ID=xxx
   GITHUB_OAUTH_CLIENT_SECRET=xxx
   ```
5. Service auto-redeploys
6. Users can now visit `https://githubbot-ezh9.onrender.com/setup`

## API Endpoints

The OAuth flow uses these endpoints:

```
GET  /setup                    # Setup page (HTML)
GET  /oauth/github             # Initiate GitHub OAuth
GET  /oauth/github/callback    # GitHub callback
GET  /oauth/discord            # Initiate Discord OAuth
GET  /oauth/discord/callback   # Discord callback
GET  /oauth/session/:sessionId # Get session data
POST /oauth/complete           # Complete setup
```

## Web UI Features

The setup interface includes:

- ✅ Step-by-step wizard
- ✅ Visual progress indicators
- ✅ Real-time GitHub repo list
- ✅ Discord guild/channel selector
- ✅ Beautiful dark/light design
- ✅ Copy-to-clipboard for webhook URL
- ✅ Error messages and validation
- ✅ Mobile responsive

## User Experience

Before (API):
```bash
curl -X POST https://example.com/api/setup \
  -H "Content-Type: application/json" \
  -d '{"discordToken":"...", "githubToken":"...", ...}'
```

After (OAuth):
1. User visits: `https://example.com/setup`
2. Clicks 2 buttons
3. Selects options
4. Done ✓

## Next Steps

1. Create OAuth apps in GitHub and Discord
2. Set environment variables on Render
3. Redeploy service
4. Users can now use `/setup` page
5. Monitor setup success in logs
