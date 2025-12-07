# GitHub-Discord Automation: Platform Selection & Repository Switching

## Implementation Summary

This document summarizes the complete implementation of **Option C** - Multi-platform support with dynamic repository/project switching and detailed action confirmation for both GitHub and GitLab.

---

## ✅ Completed Features

### 1. **Setup UI Update** (`public/setup.html`)
Users now have complete control over platform selection during initial setup:

#### Features:
- **Step 1: Platform Selection**
  - Choose between 🐙 GitHub or 🦊 GitLab
  - Clear visual distinction with platform colors (GitHub: #24292e, GitLab: #fc6d26)

- **Step 1.5: Platform-Specific Configuration**
  - GitLab: Optional self-hosted instance URL input (defaults to https://gitlab.com)
  - GitHub: Direct OAuth connection
  - Both: Full token encryption and secure storage

- **Step 3: Repository/Branch Selection**
  - Select repository/project from available options
  - Set default branch (optional, defaults to "main")
  - Select Discord guild and channel for notifications

#### UI Workflow:
```
1. Choose Platform (GitHub/GitLab)
   ↓
2. Platform Setup (OAuth + optional GitLab URL)
   ↓
3. Select Repository & Channel
   ↓
4. Setup Complete (Webhook URL ready)
```

---

### 2. **Database Schema Updates** (`src/db.js`)

#### New Columns Added:
```sql
ALTER TABLE setups ADD COLUMN IF NOT EXISTS:
  - gitlabToken TEXT              -- Encrypted GitLab PAT
  - gitlabUrl TEXT                -- GitLab instance URL (for self-hosted)
  - gitlabUsername TEXT           -- GitLab username
  - currentPlatform TEXT          -- Active platform ('github' or 'gitlab')
  - currentRepo TEXT              -- Current repository/project name
  - currentBranch TEXT            -- Default branch for commands
```

#### New Function:
```javascript
updateCurrentRepo(setupId, platform, repo, branch = 'main')
```
- Updates the active repository/project and platform
- Called when users switch repositories
- Stores preference for future commands

#### Updated Functions:
- `getSetupByWebhookId()` - Returns new fields
- `getSetupById()` - Returns new fields

---

### 3. **New Discord Commands** (`src/index.js`)

#### A. `/switch-repo` Command
**Purpose:** Switch to a different GitHub or GitLab repository without changing setup

**Options:**
- `platform` (required): GitHub or GitLab
- `repository` (required): owner/repo (GitHub) or project-path (GitLab)
- `branch` (optional): Default branch for this repo (defaults to main)

**Behavior:**
- Validates platform is connected to setup
- Updates database with new repository
- Shows confirmation embed with:
  - Platform indicator (🐙 GitHub / 🦊 GitLab)
  - Repository name
  - Default branch
  - Color coding (GitHub: dark, GitLab: orange)

**Example:**
```
/switch-repo platform:GitHub repository:paws1234/my-awesome-repo branch:develop
```

#### B. `/current-repo` Command
**Purpose:** Display current repository configuration

**Output:**
- Current platform (GitHub/GitLab)
- Active repository
- Default branch
- Discord guild and channel being monitored
- Hint about using `/switch-repo` to change

**Example Response:**
```
📦 Current Repository Configuration

🐙 GitHub                  | paws1234/my-awesome-repo
main                       | 🎯 Default Branch
#dev-channel              | #announcements
```

---

### 4. **Repository Confirmation Details**

#### Helper Function: `getRepoConfirmation(setup)`
Shows what repository/platform will be used for each action:

**Embed Fields:**
- Repository name (formatted code block)
- Branch name
- Platform indicator with color

**Color Coding:**
- GitHub: Dark (#24292e)
- GitLab: Orange (#fc6d26)

#### Updated Commands with Confirmation:
All action commands now display repository details BEFORE and AFTER execution:

1. **Create PR** - Shows: repository, branch, title
2. **Approve PR** - Shows: repository, PR title
3. **Merge PR** - Shows: repository, merge method, PR title
4. **Create Issue** - Shows: repository, issue title, labels

#### Example Confirmation Embed:
```
✏️ Creating Pull Request on 🐙 GitHub

Repository: `paws1234/my-repo`
Branch: `main`
Platform: GitHub
Title: `Add new feature`
Source Branch: `feature/awesome`

[After execution]
✅ PR Created
PR Number: #42
URL: [View PR](https://github.com/...)
```

---

### 5. **GitLab OAuth Router** (`src/gitlabOAuthRouter.js`)

Integrated GitLab OAuth flow with support for self-hosted instances:

#### Endpoints:
- `GET /api/oauth/login/gitlab` - Initiate OAuth
- `GET /api/oauth/gitlab/callback` - Handle OAuth callback
- `POST /api/disconnect/gitlab` - Revoke access

#### Features:
- State validation for security
- Support for self-hosted GitLab instances
- Encrypted token storage (AES-256-CBC)
- Username capture for reference

---

### 6. **GitLab API Module** (`src/gitlab.js`)

22 API functions covering all major GitLab operations:

#### MR Operations (Merge Requests):
- `createMR()` - Create merge request
- `approveMR()` - Approve MR
- `mergeMR()` - Merge request
- `closeMR()` - Close MR
- `commentOnMR()` - Add comment
- `assignMR()` - Assign reviewer
- `listMRs()` - List merge requests
- `getMRInfo()` - Get MR details

#### Branch Operations:
- `createBranch()` - Create branch
- `listBranches()` - List branches
- `deleteBranch()` - Delete branch

#### Issue Operations:
- `createIssue()` - Create issue
- `listIssues()` - List issues
- `closeIssue()` - Close issue
- `reopenIssue()` - Reopen issue
- `getIssueInfo()` - Get issue details
- `addLabelToIssue()` - Add label

#### Project Operations:
- `getProjectInfo()` - Get project metadata
- `getProjectStats()` - Get project statistics
- `getCommits()` - Get commit history
- `createRelease()` - Create release

#### Git Helpers:
- `getCloneCommand()` - Clone command
- `getCheckoutCommand()` - Checkout command
- `getPullCommand()` - Pull command
- `getPushCommand()` - Push command

---

## 📋 User Workflows

### Workflow 1: Initial Setup with GitHub
```
1. User visits /setup
2. Clicks "🐙 GitHub"
3. Authorizes GitHub OAuth
4. Clicks "🎮 Connect Discord"
5. Authorizes Discord OAuth
6. Selects repository (paws1234/my-repo)
7. Selects branch (main)
8. Selects Discord guild and channel
9. Setup complete! Webhook URL shown
```

### Workflow 2: Initial Setup with GitLab
```
1. User visits /setup
2. Clicks "🦊 GitLab"
3. (Optional) Enters GitLab URL (defaults to gitlab.com)
4. Authorizes GitLab OAuth
5. Clicks "🎮 Connect Discord"
6. Authorizes Discord OAuth
7. Selects project (group/my-project)
8. Selects branch (main)
9. Selects Discord guild and channel
10. Setup complete! Webhook URL shown
```

### Workflow 3: Switch to Different Repository
```
1. In Discord, use: /switch-repo platform:GitHub repository:newowner/newrepo branch:develop
2. Bot confirms action with embed showing:
   - New repository
   - New default branch
   - Platform
3. All future commands use this repository until switched again
```

### Workflow 4: Check Current Configuration
```
1. In Discord, use: /current-repo
2. Bot shows:
   - Active platform (GitHub/GitLab)
   - Active repository
   - Default branch
   - Discord channels
   - Hint to switch if needed
```

### Workflow 5: Create PR with Confirmation
```
1. In Discord, use: /create-pr branch:feature/new-feature title:"Add cool feature"
2. Bot shows confirmation embed:
   - Repository: owner/repo
   - Branch: main
   - Platform: 🐙 GitHub
   - PR Title: Add cool feature
   - Source Branch: feature/new-feature
3. PR created on GitHub
4. Bot updates embed:
   - Color changes to green ✅
   - Shows PR number and URL
5. Notification sent to Discord channel
```

---

## 🔧 Configuration & Environment Variables

### Required New Environment Variables:
```
GITLAB_CLIENT_ID=your_gitlab_app_id
GITLAB_CLIENT_SECRET=your_gitlab_app_secret
ENCRYPTION_KEY=64_hex_character_key
```

### GitLab App Setup (for self-hosted instances):
1. Go to Admin Area → Applications
2. Create new application with:
   - Redirect URI: `https://your-bot-domain/api/oauth/gitlab/callback`
   - Scopes: `api`, `read_user`, `read_repository`, `write_repository`

### GitHub App Setup (existing):
- Already configured in bot

### Discord Bot Setup (existing):
- Already configured in bot

---

## 💾 Database Migration

Existing setups are automatically migrated with new columns:
```sql
ALTER TABLE setups ADD COLUMN IF NOT EXISTS currentPlatform TEXT DEFAULT 'github';
ALTER TABLE setups ADD COLUMN IF NOT EXISTS currentRepo TEXT;
ALTER TABLE setups ADD COLUMN IF NOT EXISTS currentBranch TEXT DEFAULT 'main';
```

No data loss occurs during migration. Default values ensure backward compatibility.

---

## 🎨 UI/UX Improvements

### Setup Page:
- Clear platform selection with colored buttons
- Step-by-step guidance
- Platform-specific options (GitLab URL for self-hosted)
- Progress indication (Step 1, 2, 3, etc.)

### Discord Commands:
- Repository details shown in every action command
- Color-coded responses (GitHub dark, GitLab orange, Success green)
- Consistent embed format across all commands
- Helpful footer text suggesting related commands

### Visual Indicators:
- 🐙 GitHub icon
- 🦊 GitLab icon
- 📦 Repository/project
- 📋 Action confirmation
- ✅ Success states
- ⚠️ Warning states
- ❌ Error states

---

## 🚀 Deployment Notes

### Docker Deployment:
No changes needed to Dockerfile. All code changes are Node.js compatible.

### Environment Variables:
Add to your `.env` file or deployment platform:
```
GITLAB_CLIENT_ID=...
GITLAB_CLIENT_SECRET=...
```

### Database:
No manual migration needed. Columns are created automatically on first run.

### Restart Bot:
After deployment, the bot will:
1. Auto-migrate database schema
2. Load new commands
3. Support both GitHub and GitLab

---

## 🧪 Testing Checklist

- [ ] Setup flow with GitHub OAuth
- [ ] Setup flow with GitLab OAuth
- [ ] Setup flow with self-hosted GitLab
- [ ] Switch repository to GitHub repo
- [ ] Switch repository to GitLab project
- [ ] `/current-repo` shows correct info
- [ ] Create PR shows repository confirmation
- [ ] Create issue shows repository confirmation
- [ ] Approve PR shows repository confirmation
- [ ] Merge PR shows repository confirmation
- [ ] Notifications include repository details
- [ ] Change default branch and verify in `/current-repo`
- [ ] Multiple setups with different platforms work independently

---

## 📝 Files Modified

1. **`public/setup.html`** - UI overhaul with platform selection
2. **`src/db.js`** - Added new columns and updateCurrentRepo function
3. **`src/index.js`** - New commands, helper function, updated existing commands
4. **`src/gitlabOAuthRouter.js`** - New OAuth router for GitLab
5. **`src/gitlab.js`** - GitLab API module (already created)

---

## 🎯 Feature Matrix

| Feature | GitHub | GitLab | Status |
|---------|--------|--------|--------|
| OAuth Setup | ✅ | ✅ | Complete |
| Repository Selection | ✅ | ✅ | Complete |
| Switch Repository | ✅ | ✅ | Complete |
| Confirmation Details | ✅ | ✅ | Complete |
| Default Branch Support | ✅ | ✅ | Complete |
| Self-Hosted Support | N/A | ✅ | Complete |
| Multi-Platform Support | ✅ | ✅ | Complete |
| Command Integration | ⏳ | ⏳ | In Progress |
| Webhook Support | ✅ | ⏳ | Partial |

---

## 🔄 Next Steps

1. **Add GitLab Discord Commands** (54 commands total)
   - Create-MR, List-MRs, Approve-MR, etc.
   - Use same confirmation pattern as GitHub

2. **GitLab Webhook Integration**
   - Handle MR events
   - Handle issue events
   - Send notifications to Discord

3. **Multi-Platform Command Routing**
   - Commands automatically route to correct platform
   - Use `currentPlatform` from setup

4. **Testing & Validation**
   - Test all workflows
   - Verify token encryption
   - Check webhook delivery

---

## 📞 Support

For issues or questions about:
- **Setup**: Check `/setup` page for step-by-step guidance
- **Repository Switching**: Use `/switch-repo` followed by `/current-repo`
- **Commands**: Use Discord `/help` for command descriptions
- **Errors**: Check bot logs and Discord bot activity feed
