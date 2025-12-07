const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

module.exports = function createGitlabOAuthRouter(app, db, baseUrl) {
  const router = express.Router();

  // Start GitLab OAuth flow
  router.get('/login/gitlab', (req, res) => {
    const setupId = req.query.setup_id;
    const gitlabUrl = req.query.gitlab_url || 'https://gitlab.com';
    
    if (!setupId) {
      return res.status(400).json({ error: 'setup_id required' });
    }

    const clientId = process.env.GITLAB_CLIENT_ID;
    const redirectUri = `${baseUrl}/api/oauth/gitlab/callback`;
    const state = crypto.randomBytes(16).toString('hex');

    // Store state for verification
    req.session = req.session || {};
    req.session.gitlabState = state;
    req.session.setupId = setupId;
    req.session.gitlabUrl = gitlabUrl;

    const authUrl = `${gitlabUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=api&state=${state}`;
    
    res.redirect(authUrl);
  });

  // Handle GitLab OAuth callback
  router.get('/oauth/gitlab/callback', async (req, res) => {
    const { code, state } = req.query;

    try {
      if (!code || state !== req.session?.gitlabState) {
        return res.status(400).json({ error: 'Invalid state or missing code' });
      }

      const setupId = req.session.setupId;
      const gitlabUrl = req.session.gitlabUrl || 'https://gitlab.com';
      const clientId = process.env.GITLAB_CLIENT_ID;
      const clientSecret = process.env.GITLAB_CLIENT_SECRET;
      const redirectUri = `${baseUrl}/api/oauth/gitlab/callback`;

      // Exchange code for token
      const tokenResponse = await axios.post(
        `${gitlabUrl}/oauth/token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Get user info
      const userResponse = await axios.get(
        `${gitlabUrl}/api/v4/user`,
        {
          headers: { 'PRIVATE-TOKEN': accessToken }
        }
      );

      const username = userResponse.data.username;

      // Update setup with GitLab credentials
      const updateQuery = `
        UPDATE setups 
        SET gitlab_token = $1, gitlab_url = $2, gitlab_username = $3, updated_at = NOW()
        WHERE id = $4
      `;

      await db.query(updateQuery, [accessToken, gitlabUrl, username, setupId]);

      res.json({
        success: true,
        message: 'GitLab connected successfully!',
        username: username,
        gitlab_url: gitlabUrl
      });
    } catch (err) {
      console.error('GitLab OAuth error:', err);
      res.status(500).json({
        error: 'Failed to authenticate with GitLab',
        details: err.message
      });
    }
  });

  // Disconnect GitLab
  router.post('/disconnect/gitlab', async (req, res) => {
    const setupId = req.body.setup_id;

    try {
      const query = `
        UPDATE setups 
        SET gitlab_token = NULL, gitlab_url = NULL, gitlab_username = NULL
        WHERE id = $1
      `;

      await db.query(query, [setupId]);

      res.json({ success: true, message: 'GitLab disconnected' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to disconnect GitLab' });
    }
  });

  return router;
};
