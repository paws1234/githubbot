# Technical Architecture: Multi-Platform Support

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord User                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                    /current-repo
                    /switch-repo
                    /create-pr, /create-mr
                    /approve-pr, /list-mrs
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐   ┌─────▼──────┐  ┌────▼────┐
    │  GitHub │   │  GitLab    │  │  Setup  │
    │  OAuth  │   │  OAuth     │  │  Config │
    └────┬────┘   └─────┬──────┘  └────┬────┘
         │               │             │
         └───────────────┼─────────────┘
                         │
                    ┌────▼───────┐
                    │  discord.js │
                    │   (v14.x)   │
                    └────┬───────┘
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
  ┌───▼──────┐   ┌──────▼──────┐   ┌──────▼───┐
  │  GitHub  │   │   GitLab    │   │ Database │
  │  API     │   │    API      │   │  (Postgres
  │(Octokit) │   │  (axios)    │   │ + AES256 │
  │          │   │             │   │ Encrypt) │
  └──────────┘   └─────────────┘   └──────────┘
```

---

## Data Flow Architecture

### 1. Initial Setup Flow

```
User → /setup page
        ↓
    Choose Platform
        ↓
    OAuth Flow (GitHub/GitLab)
        ↓
    Store Encrypted Token
        ↓
    Select Repository/Project
        ↓
    Store currentPlatform, currentRepo
        ↓
    Setup Complete
```

### 2. Command Execution Flow

```
Discord User
        ↓
/create-pr (Discord slash command)
        ↓
getRepoConfirmation(setupConfig)
        ↓
Display Pre-Action Confirmation
  ├─ Repository name
  ├─ Branch
  ├─ Platform
        ↓
Execute Command (GitHub/GitLab API)
        ↓
Display Post-Action Confirmation
  ├─ Status (✅/❌)
  ├─ Result details
  ├─ Link to resource
        ↓
Send Discord Notification
```

### 3. Repository Switching Flow

```
Discord User
        ↓
/switch-repo platform:GitHub repository:owner/repo
        ↓
Validate Platform Connected
        ↓
db.updateCurrentRepo(setupId, platform, repo, branch)
        ↓
Update client.setupConfig in memory
        ↓
Show Confirmation Embed
```

---

## Database Schema

### Setups Table Structure

```sql
CREATE TABLE setups (
  -- Primary Keys
  id TEXT PRIMARY KEY,                    -- setup_xxxx-xxxx
  webhookId TEXT UNIQUE NOT NULL,         -- For GitHub webhooks
  
  -- Discord Configuration
  discordToken TEXT NOT NULL,             -- Encrypted
  discordClientId TEXT NOT NULL,
  discordGuildId TEXT NOT NULL,
  discordChannelId TEXT NOT NULL,
  
  -- GitHub Configuration
  githubToken TEXT NOT NULL,              -- Encrypted
  githubOwner TEXT NOT NULL,
  githubRepo TEXT NOT NULL,
  
  -- GitLab Configuration (NEW)
  gitlabToken TEXT,                       -- Encrypted, nullable
  gitlabUrl TEXT,                         -- For self-hosted
  gitlabUsername TEXT,
  
  -- Current Workspace (NEW)
  currentPlatform TEXT DEFAULT 'github',  -- 'github' or 'gitlab'
  currentRepo TEXT,                       -- Current repository/project
  currentBranch TEXT DEFAULT 'main',      -- Current default branch
  
  -- Metadata
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Encryption

All tokens encrypted with:
```
Algorithm:   AES-256-CBC
Key Size:    256 bits (32 bytes, 64 hex chars)
IV:          16 bytes random per token
Storage:     iv:encryptedData (hex format)
Environment: ENCRYPTION_KEY env variable
```

---

## Code Structure Changes

### File: src/index.js

#### New Helper Function
```javascript
function getRepoConfirmation(setup) {
  const platform = setup.currentPlatform || "github";
  const repo = setup.currentRepo || (platform === "github" 
    ? `${setup.githubOwner}/${setup.githubRepo}` 
    : "Not set");
  const branch = setup.currentBranch || "main";
  
  return {
    platform,
    repo,
    branch,
    embed: { /* embed object with color, fields, etc */ }
  };
}
```

#### New Commands
```javascript
// /switch-repo command
if (interaction.commandName === "switch-repo") {
  // Validate platform connected
  // Call db.updateCurrentRepo()
  // Update client.setupConfig
  // Return confirmation embed
}

// /current-repo command
if (interaction.commandName === "current-repo") {
  // Display current configuration
  // Show all relevant info
  // Return info embed
}
```

#### Updated Existing Commands
All action commands now follow pattern:
```javascript
if (interaction.commandName === "create-pr") {
  // 1. Get repo confirmation with getRepoConfirmation()
  const repoInfo = getRepoConfirmation(client.setupConfig);
  
  // 2. Create embed for action
  const confirmEmbed = {
    ...repoInfo.embed,
    title: `✏️ Creating Pull Request`,
    fields: [
      ...repoInfo.embed.fields,
      { name: "Title", value: `\`${title}\``, inline: false }
    ]
  };
  
  // 3. Execute action
  const pr = await github.createPR(...);
  
  // 4. Update embed with result
  confirmEmbed.color = 0x28a745;
  confirmEmbed.title = `✅ PR Created`;
  confirmEmbed.fields.push({ name: "PR Number", value: `#${pr.number}` });
  
  // 5. Return updated embed
  await interaction.editReply({ embeds: [confirmEmbed] });
}
```

---

### File: src/db.js

#### New Column Migration
```javascript
async function initializeDatabase() {
  // Create table with new columns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS setups (
      ...
      gitlabToken TEXT,
      gitlabUrl TEXT,
      gitlabUsername TEXT,
      currentPlatform TEXT DEFAULT 'github',
      currentRepo TEXT,
      currentBranch TEXT DEFAULT 'main'
    )
  `);
  
  // Safe migration for existing tables
  await pool.query(`
    ALTER TABLE setups
    ADD COLUMN IF NOT EXISTS gitlabToken TEXT,
    ADD COLUMN IF NOT EXISTS gitlabUrl TEXT,
    ADD COLUMN IF NOT EXISTS gitlabUsername TEXT,
    ADD COLUMN IF NOT EXISTS currentPlatform TEXT DEFAULT 'github',
    ADD COLUMN IF NOT EXISTS currentRepo TEXT,
    ADD COLUMN IF NOT EXISTS currentBranch TEXT DEFAULT 'main'
  `);
}
```

#### New Function
```javascript
async function updateCurrentRepo(setupId, platform, repo, branch = 'main') {
  const result = await pool.query(
    `UPDATE setups 
     SET currentPlatform = $1, currentRepo = $2, currentBranch = $3, 
         updatedAt = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [platform, repo, branch, setupId]
  );
  return { success: true };
}
```

#### Updated Functions
```javascript
// Updated getSetupByWebhookId and getSetupById
const row = result.rows[0];
return {
  ...existing_fields,
  gitlabToken: row.gitlabtoken ? decrypt(row.gitlabtoken) : null,
  gitlabUrl: row.gitlaburl,
  gitlabUsername: row.gitlabusername,
  currentPlatform: row.currentplatform || 'github',
  currentRepo: row.currentrepo,
  currentBranch: row.currentbranch || 'main'
};
```

---

### File: src/gitlabOAuthRouter.js (NEW)

```javascript
module.exports = function createGitlabOAuthRouter(app, db, baseUrl) {
  const router = express.Router();

  // GET /api/oauth/login/gitlab?setup_id=xxx&gitlab_url=https://...
  router.get('/login/gitlab', (req, res) => {
    // 1. Validate inputs
    // 2. Create state token
    // 3. Store state in session
    // 4. Redirect to GitLab OAuth
  });

  // GET /api/oauth/gitlab/callback?code=xxx&state=yyy
  router.get('/oauth/gitlab/callback', async (req, res) => {
    // 1. Validate state
    // 2. Exchange code for token
    // 3. Get user info
    // 4. Store encrypted token in DB
    // 5. Return success
  });

  // POST /api/disconnect/gitlab
  router.post('/disconnect/gitlab', async (req, res) => {
    // 1. Clear GitLab tokens
    // 2. Update database
    // 3. Return success
  });

  return router;
};
```

---

### File: public/setup.html (UPDATED)

#### Platform Selection UI
```html
<!-- Step 1: Choose Git Platform -->
<div class="step active" id="step-1">
  <button onclick="selectPlatform('github')">🐙 GitHub</button>
  <button onclick="selectPlatform('gitlab')">🦊 GitLab</button>
</div>

<!-- Step 1.5: Platform Setup -->
<div class="step" id="step-git-setup">
  <input type="text" id="gitlab-url" value="https://gitlab.com" />
  <button onclick="startOAuth()">🔐 Connect</button>
</div>

<!-- Step 3: Repository Selection -->
<div class="step" id="step-select">
  <select id="repo-select"></select>
  <input id="branch-input" placeholder="main" />
  <button onclick="completeSetup()">✅ Complete Setup</button>
</div>
```

#### JavaScript Logic
```javascript
let selectedPlatform = null;

function selectPlatform(platform) {
  selectedPlatform = platform;
  showStep('step-git-setup');
  // Show GitLab URL input if GitLab selected
  if (platform === 'gitlab') {
    document.getElementById('gitlab-url-group').style.display = 'block';
  }
}

function startOAuth() {
  if (selectedPlatform === 'github') {
    window.location.href = '/oauth/github';
  } else if (selectedPlatform === 'gitlab') {
    const gitlabUrl = document.getElementById('gitlab-url').value;
    window.location.href = `/api/oauth/login/gitlab?gitlab_url=${encodeURIComponent(gitlabUrl)}`;
  }
}
```

---

## Integration Points

### 1. OAuth Flow Integration

```
setup.html
    ↓
selectPlatform('github')
    ↓
/oauth/github (existing)
    ↓
OAuth callback
    ↓
Store in session/DB

setup.html
    ↓
selectPlatform('gitlab')
    ↓
/api/oauth/login/gitlab (NEW)
    ↓
GitLab OAuth callback
    ↓
Store encrypted token
```

### 2. Command Execution Integration

```
Discord User
    ↓
Slash Command (e.g., /create-pr)
    ↓
interaction.commandName check
    ↓
getRepoConfirmation(client.setupConfig)
    ↓
Route to GitHub or GitLab API
    ↓
Display confirmation
```

### 3. Repository Switching Integration

```
Discord User
    ↓
/switch-repo
    ↓
db.updateCurrentRepo()
    ↓
client.setupConfig updated
    ↓
All future commands use new repo
```

---

## Error Handling

### Platform Validation
```javascript
if (platform === "github" && !githubToken) {
  return "❌ GitHub not connected";
}

if (platform === "gitlab" && !client.setupConfig.gitlabToken) {
  return "❌ GitLab not connected";
}
```

### Repository Validation
```javascript
try {
  const repo = await github.getRepoInfo(token, owner, repo);
  // Proceed
} catch (err) {
  return `❌ Repository not found: ${err.message}`;
}
```

### State Validation (OAuth)
```javascript
if (!code || state !== req.session?.gitlabState) {
  return "❌ Invalid state or missing code";
}
```

---

## Performance Considerations

### Database
- Indexes on `id`, `webhookId` (implicit from PRIMARY KEY, UNIQUE)
- Single query for setup retrieval
- Update with RETURNING clause for efficiency

### API Calls
- No additional API calls for repository switching
- All info stored in database
- Cached in memory on client

### Memory Usage
- One bot instance per setup
- setupConfig stored in client object
- Minimal overhead

---

## Security Considerations

### Token Security
- AES-256-CBC encryption for all tokens
- Random 16-byte IV per token
- Keys never logged or exposed
- Tokens cleared on disconnect

### OAuth Security
- State token validation
- Secure redirect handling
- HTTPS enforced in production
- Scopes limited to necessary permissions

### CORS & Access Control
- Discord user validation on commands
- Setup ownership validation
- Guild membership verification

---

## Environment Variables

```
# Existing
DATABASE_URL=postgresql://user:pass@host:port/db
DISCORD_TOKEN=bot_token_here
GITHUB_CLIENT_ID=github_app_id
GITHUB_CLIENT_SECRET=github_app_secret
ENCRYPTION_KEY=64_hex_character_key

# New
GITLAB_CLIENT_ID=gitlab_app_id
GITLAB_CLIENT_SECRET=gitlab_app_secret
```

---

## Testing Strategy

### Unit Tests (Proposed)
- `getRepoConfirmation()` - Correct embed generation
- `updateCurrentRepo()` - Database updates
- OAuth state validation
- Token encryption/decryption

### Integration Tests (Proposed)
- GitHub OAuth flow
- GitLab OAuth flow
- Repository switching
- Command execution with confirmation

### Manual Tests
- Setup with GitHub
- Setup with GitLab
- Setup with self-hosted GitLab
- Switch repositories
- Verify confirmation embeds
- Multiple setups

---

## Deployment Checklist

- [ ] Add GITLAB_CLIENT_ID to environment
- [ ] Add GITLAB_CLIENT_SECRET to environment
- [ ] Verify ENCRYPTION_KEY is set
- [ ] Build Docker image with new code
- [ ] Deploy to Render/hosting
- [ ] Run database migrations (automatic)
- [ ] Verify bot starts successfully
- [ ] Test GitHub OAuth flow
- [ ] Test GitLab OAuth flow
- [ ] Test /switch-repo command
- [ ] Test /current-repo command
- [ ] Test action commands with confirmation

---

## Maintenance Notes

### Regular Tasks
- Monitor OAuth token expiration
- Check database growth
- Verify webhook delivery
- Clear old sessions

### Troubleshooting
- Check bot logs for token errors
- Verify OAuth credentials are current
- Ensure database connections are stable
- Monitor API rate limits

### Updates
- GitLab API version is v4 (stable)
- GitHub API via Octokit maintained
- Discord.js v14.x compatible
- Node.js 18+ recommended

---

Document Version: 2.0
Last Updated: December 7, 2025
Architecture: Multi-Platform (GitHub + GitLab)
