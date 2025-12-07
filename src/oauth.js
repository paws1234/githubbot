const axios = require('axios');
const crypto = require('crypto');

// Store OAuth states temporarily (in production, use Redis/database)
const oauthStates = new Map();

/**
 * Generate GitHub OAuth URL
 */
function getGithubOAuthUrl(redirectUri) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error('GITHUB_OAUTH_CLIENT_ID not set');

  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, { type: 'github', timestamp: Date.now() });

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('scope', 'repo');
  url.searchParams.append('state', state);

  return url.toString();
}

/**
 * Generate Discord OAuth URL
 */
function getDiscordOAuthUrl(redirectUri) {
  const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error('DISCORD_OAUTH_CLIENT_ID not set');

  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, { type: 'discord', timestamp: Date.now() });

  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', 'identify guilds');
  url.searchParams.append('state', state);

  return url.toString();
}

/**
 * Exchange GitHub code for access token
 */
async function exchangeGithubCode(code, redirectUri) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials not configured');
  }

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      },
      {
        headers: { Accept: 'application/json' }
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }

    return response.data.access_token;
  } catch (err) {
    throw new Error(`Failed to exchange GitHub code: ${err.message}`);
  }
}

/**
 * Exchange Discord code for access token
 */
async function exchangeDiscordCode(code, redirectUri) {
  const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
  const clientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Discord OAuth credentials not configured');
  }

  try {
    const response = await axios.post(
      'https://discord.com/api/v10/oauth2/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to exchange Discord code: ${err.message}`);
  }
}

/**
 * Get GitHub user info and repos
 */
async function getGithubUser(accessToken) {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    });
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch GitHub user: ${err.message}`);
  }
}

/**
 * Get GitHub user repos
 */
async function getGithubRepos(accessToken) {
  try {
    const response = await axios.get('https://api.github.com/user/repos?per_page=100', {
      headers: { Authorization: `token ${accessToken}` }
    });
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch GitHub repos: ${err.message}`);
  }
}

/**
 * Get Discord user info
 */
async function getDiscordUser(accessToken) {
  try {
    const response = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch Discord user: ${err.message}`);
  }
}

/**
 * Get Discord user guilds
 */
async function getDiscordGuilds(accessToken) {
  try {
    const response = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch Discord guilds: ${err.message}`);
  }
}

/**
 * Get Discord guild channels
 */
async function getDiscordChannels(guildId, botToken, userToken = null) {
  try {
    // Try with bot token first
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        headers: { Authorization: `Bot ${botToken}` }
      }
    );
    return response.data.filter(ch => ch.type === 0); // Only text channels
  } catch (botErr) {
    // If bot token fails and user token available, try user token
    if (userToken && botErr.response?.status === 403) {
      try {
        console.warn('⚠️ Bot token failed (403), trying user token as fallback...');
        const response = await axios.get(
          `https://discord.com/api/v10/users/@me/guilds/${guildId}/channels`,
          {
            headers: { Authorization: `Bearer ${userToken}` }
          }
        );
        return response.data.filter(ch => ch.type === 0);
      } catch (userErr) {
        throw new Error(`Failed to fetch channels with both bot and user tokens: ${userErr.message}`);
      }
    }
    throw new Error(`Failed to fetch Discord channels: ${botErr.message}`);
  }
}

/**
 * Validate OAuth state (prevents CSRF)
 */
function validateState(state) {
  const stateData = oauthStates.get(state);
  
  if (!stateData) {
    throw new Error('Invalid state parameter');
  }

  // Clean up old states (older than 10 minutes)
  if (Date.now() - stateData.timestamp > 600000) {
    oauthStates.delete(state);
    throw new Error('State expired');
  }

  oauthStates.delete(state);
  return stateData;
}

module.exports = {
  getGithubOAuthUrl,
  getDiscordOAuthUrl,
  exchangeGithubCode,
  exchangeDiscordCode,
  getGithubUser,
  getGithubRepos,
  getDiscordUser,
  getDiscordGuilds,
  getDiscordChannels,
  validateState
};
