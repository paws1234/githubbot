const express = require('express');
const oauth = require('./oauth');
const db = require('./db');

const router = express.Router();

// Store session data temporarily (in production, use proper sessions)
const userSessions = new Map();

/**
 * GET /oauth/github
 * Redirect to GitHub OAuth
 */
router.get('/github', (req, res) => {
  try {
    const redirectUri = `${getBaseUrl(req)}/oauth/github/callback`;
    console.log(`🔗 GitHub OAuth - Redirect URI: ${redirectUri}`);
    console.log(`🔗 APP_BASE_URL env: ${process.env.APP_BASE_URL}`);
    const url = oauth.getGithubOAuthUrl(redirectUri);
    console.log(`🔗 GitHub OAuth URL: ${url}`);
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /oauth/github/callback
 * GitHub OAuth callback
 */
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    const stateData = oauth.validateState(state);
    const redirectUri = `${getBaseUrl(req)}/oauth/github/callback`;
    const githubToken = await oauth.exchangeGithubCode(code, redirectUri);
    const githubUser = await oauth.getGithubUser(githubToken);
    const repos = await oauth.getGithubRepos(githubToken);

    // Store in session
    const sessionId = generateSessionId();
    userSessions.set(sessionId, {
      githubToken,
      githubUser,
      repos,
      createdAt: Date.now()
    });

    // Redirect to Discord OAuth or setup page
    res.redirect(`/setup?session=${sessionId}&step=discord`);
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /oauth/discord
 * Redirect to Discord OAuth
 */
router.get('/discord', (req, res) => {
  try {
    const { session } = req.query;
    if (!session || !userSessions.has(session)) {
      return res.status(400).json({ error: 'Invalid or missing session' });
    }

    const redirectUri = `${getBaseUrl(req)}/oauth/discord/callback`;
    const url = oauth.getDiscordOAuthUrl(redirectUri);
    
    // Store session in query for callback
    res.redirect(url + `&state=${session}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /oauth/discord/callback
 * Discord OAuth callback
 */
router.get('/discord/callback', async (req, res) => {
  try {
    const { code, state: sessionId } = req.query;

    if (!code || !sessionId || !userSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session or code' });
    }

    const session = userSessions.get(sessionId);
    const redirectUri = `${getBaseUrl(req)}/oauth/discord/callback`;
    const discordTokenData = await oauth.exchangeDiscordCode(code, redirectUri);
    const discordUser = await oauth.getDiscordUser(discordTokenData.access_token);
    const guilds = await oauth.getDiscordGuilds(discordTokenData.access_token);

    // Update session
    userSessions.set(sessionId, {
      ...session,
      discordToken: discordTokenData.access_token,
      discordUser,
      guilds,
      step: 'select-config'
    });

    // Redirect to setup page to select guild and channel
    res.redirect(`/setup?session=${sessionId}&step=select-config`);
  } catch (err) {
    console.error('Discord OAuth error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /oauth/session/:sessionId
 * Get session data
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = userSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Clean up old sessions (older than 1 hour)
  if (Date.now() - session.createdAt > 3600000) {
    userSessions.delete(sessionId);
    return res.status(404).json({ error: 'Session expired' });
  }

  res.json({
    githubUser: session.githubUser,
    repos: session.repos,
    discordUser: session.discordUser,
    guilds: session.guilds,
    step: session.step
  });
});

/**
 * GET /oauth/channels/:sessionId/:guildId
 * Get Discord channels for a guild
 */
router.get('/channels/:sessionId/:guildId', async (req, res) => {
  try {
    const { sessionId, guildId } = req.params;
    
    const session = userSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Use bot token from environment to fetch channels
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const channels = await oauth.getDiscordChannels(guildId, botToken);
    res.json({ channels });
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /oauth/complete
 * Complete setup with selected repo and guild/channel
 */
router.post('/complete', async (req, res) => {
  try {
    const { sessionId, repoName, guildId, channelId } = req.body;

    if (!sessionId || !repoName || !guildId || !channelId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = userSessions.get(sessionId);
    if (!session || !session.discordToken) {
      return res.status(400).json({ error: 'Invalid or incomplete session' });
    }

    const [owner, repo] = repoName.split('/');

    // Create setup in database
    // Use bot token from environment (not the OAuth user token)
    const setup = await db.createSetup({
      discordToken: process.env.DISCORD_BOT_TOKEN,
      discordClientId: process.env.DISCORD_BOT_CLIENT_ID,
      discordGuildId: guildId,
      discordChannelId: channelId,
      githubToken: session.githubToken,
      githubOwner: owner,
      githubRepo: repo
    });

    // Clean up session
    userSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Setup completed successfully!',
      setup: {
        id: setup.id,
        webhookId: setup.webhookId,
        repo: `${owner}/${repo}`,
        discordGuild: guildId,
        webhookUrl: `${getBaseUrl(req)}/webhook/${setup.webhookId}`
      }
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions
function getBaseUrl(req) {
  // Use environment variable if set (recommended for production)
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  // Fallback to request headers
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

function generateSessionId() {
  return require('crypto').randomBytes(32).toString('hex');
}

module.exports = router;
