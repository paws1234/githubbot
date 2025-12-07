# Quick Reference: Multi-Platform Support Guide

## 🎯 Key Commands

### Check Current Configuration
```
/current-repo
```
Shows which repository/project and platform you're currently using.

**Response:**
- Platform indicator (🐙 GitHub or 🦊 GitLab)
- Current repository/project name
- Default branch
- Discord channel info

---

### Switch to Different Repository
```
/switch-repo platform:GitHub repository:owner/repo branch:main
```

**Required Parameters:**
- `platform` - Choose from: GitHub, GitLab
- `repository` - GitHub format: `owner/repo` | GitLab format: `group/project`
- `branch` (optional) - Defaults to "main"

**Example - GitHub:**
```
/switch-repo platform:GitHub repository:paws1234/my-awesome-project branch:develop
```

**Example - GitLab:**
```
/switch-repo platform:GitLab repository:my-group/my-project branch:main
```

**Response:**
Confirmation embed showing:
- Platform (with color coding)
- Repository name
- Default branch
- Note about platform-specific operations

---

## 🚀 Action Commands with Repository Details

All action commands now show:
1. **Before Action** - What repository you're about to modify
2. **During Action** - Processing indicator
3. **After Action** - Success confirmation with details

### Create Pull Request
```
/create-pr branch:feature/new-feature title:"Add awesome feature" body:"Fixes #123"
```
Shows: Repository, default branch, PR title, source branch

### Create Issue
```
/create-issue title:"Bug report" body:"Description here" labels:"bug,urgent"
```
Shows: Repository, issue title, labels

### Approve Pull Request
```
/approve-pr number:42
```
Shows: Repository, PR title being approved

### Merge Pull Request
```
/merge-pr number:42 method:squash
```
Shows: Repository, merge method, PR title

---

## 🐙 GitHub Setup

### Initial Setup:
1. Visit `/setup`
2. Click "🐙 GitHub"
3. Authorize GitHub OAuth
4. Connect Discord
5. Select repository
6. Choose branch
7. Select Discord channel

### Switching Repositories:
```
/switch-repo platform:GitHub repository:new-owner/new-repo
```

### Repository Format:
Always use: `owner/repository-name`

### Supported Operations:
- Create/List/Merge PRs
- Create/List/Close Issues
- Create/Manage Branches
- Trigger CI/CD
- View Releases
- Security scanning

---

## 🦊 GitLab Setup

### Initial Setup:
1. Visit `/setup`
2. Click "🦊 GitLab"
3. (Optional) Enter GitLab URL for self-hosted (defaults to gitlab.com)
4. Authorize GitLab OAuth
5. Connect Discord
6. Select project
7. Choose branch
8. Select Discord channel

### Switching Projects:
```
/switch-repo platform:GitLab repository:group/project-name
```

### Project Format:
Always use: `group/project-name` or `subgroup/project-name`

### Supported Operations:
- Create/List/Merge MRs (Merge Requests)
- Create/List/Close Issues
- Create/Manage Branches
- View Project Info
- Manage Releases
- Security checks

### Self-Hosted GitLab:
If using self-hosted GitLab during setup, enter your URL:
- Format: `https://your-gitlab-domain.com`
- Only http/https URLs supported
- Must be accessible from bot server

---

## 🎨 Color Coding

### Response Colors:
- **Dark (#24292e)** - GitHub operations
- **Orange (#fc6d26)** - GitLab operations
- **Green (#28a745)** - Success ✅
- **Yellow (#ffc107)** - Warnings ⚠️
- **Red (#dc3545)** - Errors ❌

### Status Icons:
- 🐙 - GitHub
- 🦊 - GitLab
- 📦 - Repository/Project
- ✅ - Success
- ⚠️ - Warning
- ❌ - Error
- 📋 - Configuration/Info

---

## 🔄 Changing Defaults

### Change Default Branch:
```
/switch-repo platform:GitHub repository:owner/repo branch:develop
```
Now all future PR/issue creation will default to `develop` branch.

### Verify Changes:
```
/current-repo
```
Confirm new branch is showing.

---

## ❌ Troubleshooting

### "Platform is not connected"
**Error:** "GitHub/GitLab is not connected to this setup"

**Solution:** 
1. Go back to `/setup`
2. Add the missing platform
3. Authorize OAuth
4. Restart bot

### "Repository not found"
**Error:** "Could not find repository"

**Possible causes:**
- Wrong owner/group name
- Repository name has spaces (use hyphens: `my-repo`)
- Insufficient permissions on the account

**Solution:**
- Verify repository name: `/current-repo`
- Check you have access to repository
- Try switching with correct format

### Wrong branch showing
**Error:** Commands executing on wrong branch

**Solution:**
```
/switch-repo platform:GitHub repository:owner/repo branch:correct-branch
```

### Token expired
**Error:** "Invalid token" or "Unauthorized"

**Solution:**
1. Go to `/setup`
2. Disconnect the platform
3. Reconnect and re-authorize
4. Restart bot

---

## 💡 Tips & Best Practices

### 1. Always Verify Configuration
Before running important operations:
```
/current-repo
```

### 2. Use Branch Names Carefully
- Avoid spaces in branch names
- Use hyphens instead of underscores
- Lowercase recommended

### 3. Consistent Repository Format
- GitHub: `owner/repo`
- GitLab: `group/project`
- Never use spaces or special characters

### 4. Multiple Setups
You can have multiple bot setups, each connected to different platforms:
- Setup 1: GitHub organization
- Setup 2: GitLab instance
- etc.

### 5. Permissions
Ensure your OAuth token has these permissions:
- **GitHub:** repo, workflow, admin:org_hook
- **GitLab:** api, read_repository, write_repository

---

## 📊 Command Reference Table

| Command | Platform | Purpose | Response |
|---------|----------|---------|----------|
| `/current-repo` | Both | Show current config | Info embed |
| `/switch-repo` | Both | Change repository | Confirmation embed |
| `/create-pr` | GitHub | Create PR | With repo details |
| `/create-mr` | GitLab | Create MR | With project details |
| `/approve-pr` | GitHub | Approve PR | Confirmation embed |
| `/merge-pr` | GitHub | Merge PR | Confirmation embed |
| `/create-issue` | Both | Create issue | With repo details |
| `/list-prs` | GitHub | List PRs | Summary |
| `/list-mrs` | GitLab | List MRs | Summary |

---

## 🔐 Security Notes

### Token Encryption:
- All tokens encrypted with AES-256-CBC
- Keys stored securely in environment
- Never logged or displayed

### OAuth:
- State validation on all OAuth flows
- Secure redirect handling
- User consent required for each platform

### Self-Hosted GitLab:
- HTTPS required for production
- SSL certificates validated
- Firewall rules recommended

---

## 📞 Support Quick Links

- **Docs**: Check `IMPLEMENTATION_SUMMARY.md` for detailed docs
- **Setup Help**: Visit `/setup` page for step-by-step guidance
- **Command Help**: Use Discord `/help` within bot
- **Bot Logs**: Check Docker logs for detailed error messages
- **Issues**: Check GitHub issues or GitLab issues in your projects

---

## 🎓 Example Workflows

### GitHub to GitLab Migration
```
1. /current-repo                    # Note current GitHub setup
2. /switch-repo platform:GitLab repository:my-group/my-project
3. /current-repo                    # Verify GitLab is now active
4. /create-pr branch:main title:"Same PR on GitLab"
```

### Multi-Repository Project
```
# Setup 1: Frontend repo
/switch-repo platform:GitHub repository:mycompany/frontend

# Create PR on frontend
/create-pr branch:feature/ui title:"New UI"

# Switch to backend repo
/switch-repo platform:GitHub repository:mycompany/backend branch:develop

# Create PR on backend
/create-pr branch:feature/api title:"New API endpoint"
```

### Cross-Platform Workflow
```
# Create issue on GitHub
/switch-repo platform:GitHub repository:owner/my-repo
/create-issue title:"New feature needed"

# Also track on GitLab
/switch-repo platform:GitLab repository:my-group/my-project
/create-issue title:"New feature needed" body:"Synced from GitHub"
```

---

Last Updated: December 7, 2025
Version: 2.0 (Multi-Platform Support)
