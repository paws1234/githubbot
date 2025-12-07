const express = require('express');
const db = require('./db');

const router = express.Router();

/**
 * POST /api/setup
 * 
 * Users submit their Discord and GitHub credentials
 * Tokens are encrypted and stored in database
 * Returns a webhookId for them to use in GitHub
 * 
 * Request body:
 * {
 *   "discordToken": "...",
 *   "discordClientId": "...",
 *   "discordGuildId": "...",
 *   "discordChannelId": "...",
 *   "githubToken": "...",
 *   "githubOwner": "...",
 *   "githubRepo": "..."
 * }
 */
router.post('/setup', async (req, res) => {
  try {
    const {
      discordToken,
      discordClientId,
      discordGuildId,
      discordChannelId,
      githubToken,
      githubOwner,
      githubRepo
    } = req.body;

    // Validate all required fields
    if (!discordToken || !discordClientId || !discordGuildId || !discordChannelId || !githubToken || !githubOwner || !githubRepo) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: [
          'discordToken',
          'discordClientId',
          'discordGuildId',
          'discordChannelId',
          'githubToken',
          'githubOwner',
          'githubRepo'
        ]
      });
    }

    // Validate Discord token format (should start with specific prefix)
    if (typeof discordToken !== 'string' || discordToken.length < 50) {
      return res.status(400).json({
        error: 'Invalid Discord token format',
        hint: 'Token should be from Discord Developer Portal'
      });
    }

    // Validate GitHub token format (should start with github_pat_ or ghp_)
    if (typeof githubToken !== 'string' || (!githubToken.startsWith('github_pat_') && !githubToken.startsWith('ghp_'))) {
      return res.status(400).json({
        error: 'Invalid GitHub token format',
        hint: 'Token should start with "github_pat_" or "ghp_"'
      });
    }

    // Create setup with encrypted tokens
    const setup = await db.createSetup({
      discordToken,
      discordClientId,
      discordGuildId,
      discordChannelId,
      githubToken,
      githubOwner,
      githubRepo
    });

    // Return public info (NO TOKENS)
    res.status(201).json({
      success: true,
      message: 'Setup created successfully! Your tokens are encrypted and secure.',
      setup: {
        id: setup.id,
        webhookId: setup.webhookId,
        repo: `${setup.githubOwner}/${setup.githubRepo}`,
        discordGuild: setup.discordGuildId
      },
      nextSteps: {
        step1: 'Copy your webhookId',
        step2: 'Go to GitHub repo settings → Webhooks',
        step3: 'Create webhook with payload URL:',
        payloadUrl: `${getBaseUrl(req)}/webhook/${setup.webhookId}`,
        contentType: 'application/json',
        events: ['pull_requests', 'pushes']
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({
      error: 'Setup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/setups
 * Get list of all active setups (no tokens shown)
 */
router.get('/setups', async (req, res) => {
  try {
    const setups = await db.getAllSetups();
    res.json({
      count: setups.length,
      setups
    });
  } catch (error) {
    console.error('Fetch setups error:', error);
    res.status(500).json({ error: 'Failed to fetch setups' });
  }
});

/**
 * DELETE /api/setup/:id
 * Disable a setup (soft delete)
 */
router.delete('/setup/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Setup ID required' });
    }

    const disabled = await db.disableSetup(id);

    if (!disabled) {
      return res.status(404).json({ error: 'Setup not found' });
    }

    res.json({
      success: true,
      message: 'Setup disabled successfully'
    });
  } catch (error) {
    console.error('Delete setup error:', error);
    res.status(500).json({ error: 'Failed to delete setup' });
  }
});

/**
 * GET /api/setup/:id
 * Get setup details (no tokens)
 */
router.get('/setup/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const setup = await db.getSetupById(id);

    if (!setup) {
      return res.status(404).json({ error: 'Setup not found' });
    }

    // Return public info only
    res.json({
      id: setup.id,
      webhookId: setup.webhookId,
      repo: `${setup.githubOwner}/${setup.githubRepo}`,
      discordGuild: setup.discordGuildId,
      createdAt: setup.createdAt
    });
  } catch (error) {
    console.error('Fetch setup error:', error);
    res.status(500).json({ error: 'Failed to fetch setup' });
  }
});

/**
 * Helper to get base URL for webhook
 */
function getBaseUrl(req) {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || req.hostname;
  return `${protocol}://${host}`;
}

module.exports = router;
