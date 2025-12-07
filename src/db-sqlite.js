const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'data', 'setups.db');
const dataDir = path.dirname(dbPath);

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Get encryption key from environment or generate one
// ⚠️ IMPORTANT: In production, store this securely (e.g., AWS Secrets Manager)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

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
db.serialize(() => {
  db.run(`
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
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

/**
 * Create a new setup with encrypted tokens
 * @param {Object} setupData - Discord and GitHub credentials
 * @returns {Promise<Object>} Setup with webhookId
 */
function createSetup(setupData) {
  return new Promise((resolve, reject) => {
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

    // Encrypt sensitive tokens
    const encryptedDiscordToken = encrypt(discordToken);
    const encryptedGithubToken = encrypt(githubToken);

    db.run(
      `INSERT INTO setups (
        id, webhookId, discordToken, discordClientId, discordGuildId, 
        discordChannelId, githubToken, githubOwner, githubRepo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        webhookId,
        encryptedDiscordToken,
        discordClientId,
        discordGuildId,
        discordChannelId,
        encryptedGithubToken,
        githubOwner,
        githubRepo
      ],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // Return public info only (no tokens)
          resolve({
            id,
            webhookId,
            githubOwner,
            githubRepo,
            discordGuildId,
            createdAt: new Date().toISOString()
          });
        }
      }
    );
  });
}

/**
 * Get setup by webhookId and decrypt tokens
 * @param {String} webhookId - The webhook ID
 * @returns {Promise<Object>} Setup with decrypted tokens
 */
function getSetupByWebhookId(webhookId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM setups WHERE webhookId = ? AND isActive = 1',
      [webhookId],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          // Decrypt tokens
          row.discordToken = decrypt(row.discordToken);
          row.githubToken = decrypt(row.githubToken);
          resolve(row);
        }
      }
    );
  });
}

/**
 * Get setup by ID and decrypt tokens
 * @param {String} id - The setup ID
 * @returns {Promise<Object>} Setup with decrypted tokens
 */
function getSetupById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM setups WHERE id = ? AND isActive = 1',
      [id],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          // Decrypt tokens
          row.discordToken = decrypt(row.discordToken);
          row.githubToken = decrypt(row.githubToken);
          resolve(row);
        }
      }
    );
  });
}

/**
 * Get all setups (public info only)
 * @returns {Promise<Array>} Array of setups without tokens
 */
function getAllSetups() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, webhookId, githubOwner, githubRepo, discordGuildId, createdAt 
       FROM setups WHERE isActive = 1 ORDER BY createdAt DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Disable a setup (soft delete)
 * @param {String} id - The setup ID
 * @returns {Promise<Boolean>} Whether deletion was successful
 */
function disableSetup(id) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE setups SET isActive = 0 WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

/**
 * Update setup (keep tokens encrypted)
 * @param {String} id - The setup ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Boolean>} Whether update was successful
 */
function updateSetup(id, updates) {
  return new Promise((resolve, reject) => {
    // Don't allow direct token updates
    const allowedFields = ['githubOwner', 'githubRepo', 'discordChannelId'];
    const safeUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        safeUpdates[key] = updates[key];
      }
    });

    if (Object.keys(safeUpdates).length === 0) {
      resolve(false);
      return;
    }

    const fields = Object.keys(safeUpdates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(safeUpdates);

    db.run(
      `UPDATE setups SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

module.exports = {
  createSetup,
  getSetupByWebhookId,
  getSetupById,
  getAllSetups,
  disableSetup,
  updateSetup,
  db,
  ENCRYPTION_KEY
};
