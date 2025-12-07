const { Pool } = require('pg');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY not set in environment variables!');
  process.exit(1);
}

// Verify key is 64 hex chars (32 bytes)
if (ENCRYPTION_KEY.length !== 64 || !/^[a-f0-9]{64}$/i.test(ENCRYPTION_KEY)) {
  console.error('❌ ENCRYPTION_KEY must be 64 hex characters!');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS setups (
        id TEXT PRIMARY KEY,
        webhookId TEXT UNIQUE NOT NULL,
        discordToken TEXT NOT NULL,
        discordClientId TEXT NOT NULL,
        discordGuildId TEXT NOT NULL,
        discordChannelId TEXT NOT NULL,
        githubToken TEXT NOT NULL,
        githubOwner TEXT NOT NULL,
        githubRepo TEXT NOT NULL,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    throw err;
  }
}

/**
 * Create a new setup with encrypted tokens
 */
async function createSetup(setupData) {
  const id = `setup_${uuidv4()}`;
  const webhookId = uuidv4();
  const {
    discordToken,
    discordClientId,
    discordGuildId,
    discordChannelId,
    githubToken,
    githubOwner,
    githubRepo
  } = setupData;

  const encryptedDiscordToken = encrypt(discordToken);
  const encryptedGithubToken = encrypt(githubToken);

  try {
    const result = await pool.query(
      `INSERT INTO setups (id, webhookId, discordToken, discordClientId, discordGuildId, discordChannelId, githubToken, githubOwner, githubRepo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, webhookId, encryptedDiscordToken, discordClientId, discordGuildId, discordChannelId, encryptedGithubToken, githubOwner, githubRepo]
    );

    return {
      id: result.rows[0].id,
      webhookId: result.rows[0].webhookid,
      githubOwner: result.rows[0].githubowner,
      githubRepo: result.rows[0].githubrepo,
      discordGuildId: result.rows[0].discordguildid
    };
  } catch (err) {
    console.error('❌ Failed to create setup:', err.message);
    throw err;
  }
}

/**
 * Get setup by webhookId and decrypt tokens
 */
async function getSetupByWebhookId(webhookId) {
  try {
    const result = await pool.query(
      'SELECT * FROM setups WHERE webhookId = $1 AND isActive = true',
      [webhookId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      webhookId: row.webhookid,
      discordToken: decrypt(row.discordtoken),
      discordClientId: row.discordclientid,
      discordGuildId: row.discordguildid,
      discordChannelId: row.discordchannelid,
      githubToken: decrypt(row.githubtoken),
      githubOwner: row.githubowner,
      githubRepo: row.githubrepo,
      isActive: row.isactive
    };
  } catch (err) {
    console.error('❌ Failed to get setup:', err.message);
    throw err;
  }
}

/**
 * Get setup by ID and decrypt tokens
 */
async function getSetupById(id) {
  try {
    const result = await pool.query(
      'SELECT * FROM setups WHERE id = $1 AND isActive = true',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      webhookId: row.webhookid,
      discordToken: decrypt(row.discordtoken),
      discordClientId: row.discordclientid,
      discordGuildId: row.discordguildid,
      discordChannelId: row.discordchannelid,
      githubToken: decrypt(row.githubtoken),
      githubOwner: row.githubowner,
      githubRepo: row.githubrepo,
      isActive: row.isactive
    };
  } catch (err) {
    console.error('❌ Failed to get setup by ID:', err.message);
    throw err;
  }
}

/**
 * Get all active setups (NO tokens)
 */
async function getAllSetups() {
  try {
    const result = await pool.query(
      'SELECT id, webhookId, discordClientId, discordGuildId, githubOwner, githubRepo, createdAt FROM setups WHERE isActive = true ORDER BY createdAt DESC'
    );

    return result.rows.map(row => ({
      id: row.id,
      webhookId: row.webhookid,
      discordClientId: row.discordclientid,
      discordGuildId: row.discordguildid,
      githubOwner: row.githubowner,
      githubRepo: row.githubrepo,
      createdAt: row.createdat
    }));
  } catch (err) {
    console.error('❌ Failed to get all setups:', err.message);
    throw err;
  }
}

/**
 * Disable a setup (soft delete)
 */
async function disableSetup(id) {
  try {
    const result = await pool.query(
      'UPDATE setups SET isActive = false, updatedAt = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Setup not found');
    }

    return { success: true, message: 'Setup disabled' };
  } catch (err) {
    console.error('❌ Failed to disable setup:', err.message);
    throw err;
  }
}

/**
 * Update a setup (repository, channel, etc)
 */
async function updateSetup(id, updates) {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    if (updates.githubOwner) {
      fields.push(`githubOwner = $${paramCount}`);
      values.push(updates.githubOwner);
      paramCount++;
    }
    if (updates.githubRepo) {
      fields.push(`githubRepo = $${paramCount}`);
      values.push(updates.githubRepo);
      paramCount++;
    }
    if (updates.discordChannelId) {
      fields.push(`discordChannelId = $${paramCount}`);
      values.push(updates.discordChannelId);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update updatedAt
    fields.push(`updatedAt = CURRENT_TIMESTAMP`);
    
    // Add id to WHERE clause
    values.push(id);
    const whereParam = paramCount;

    const query = `UPDATE setups SET ${fields.join(', ')} WHERE id = $${whereParam} RETURNING *`;
    
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Setup not found');
    }

    const row = result.rows[0];
    return decryptSetup(row);
  } catch (err) {
    console.error('❌ Failed to update setup:', err.message);
    throw err;
  }
}

module.exports = {
  initializeDatabase,
  createSetup,
  getSetupByWebhookId,
  getSetupById,
  getAllSetups,
  disableSetup,
  updateSetup,
  pool
};
