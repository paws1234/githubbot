# GitHub ↔ Discord Automation (Mini n8n)

This is a small workflow-style automation service that connects **Discord** and **GitHub**:

- Create PRs from Discord
- Approve PRs from Discord
- Comment on PRs from Discord
- Merge PRs from Discord
- Receive GitHub events (PR opened, push, etc.) and post to a Discord channel

All packed into a **Node.js + Docker** stack.

---

## 1. Prerequisites

- Node.js 18+ (for local dev) or just Docker
- A Discord account
- A GitHub account + Personal Access Token (PAT)
- A public URL for GitHub webhooks (e.g. via ngrok) if running locally

---

## 2. Setup Discord Bot

### A. Create Bot Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an **Application**, then add a **Bot**.
3. Enable the `applications.commands` scope in OAuth2.
4. Copy:
   - **Bot Token** → `DISCORD_BOT_TOKEN`
   - **Application ID** → `DISCORD_BOT_CLIENT_ID`

### B. Add Bot to Your Server (with Admin Permissions)

**Option 1: Easy (Recommended)**
- Replace `YOUR_CLIENT_ID` with your bot's Application ID and open this link:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot
```
The `permissions=8` means "Administrator"

**Option 2: Manual**
1. Go to **OAuth2 → URL Generator** in Discord Developer Portal
2. Check scopes: `bot`
3. Check permissions: `Administrator`
4. Copy the generated URL and open it

### C. Get Server & Channel Info

5. Grab the **Guild (Server) ID** and a **Channel ID** for notifications:
   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click your server name → Copy Server ID
   - Right-click a channel → Copy Channel ID

---

## 3. Setup GitHub

1. Create a **Personal Access Token (classic or fine-grained)** with:
   - `repo` permissions (at minimum for the target repo).
2. Decide which repo will be controlled:
   - `GITHUB_OWNER` → your username or org
   - `GITHUB_REPO` → repository name

---

## 4. Configure Environment

Copy the example:

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
DISCORD_CHANNEL_ID=...

GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...

PORT=3000
```

---

## 5. Run with Docker

```bash
docker compose up --build
```

This will:

- Build the Node.js image
- Start the Discord bot
- Start the Express server on port 3000

---

## 6. Registering Slash Commands

Slash commands are automatically registered on startup **to the guild** specified by `DISCORD_GUILD_ID`.

You will see in logs:

```text
🔧 Registering Discord slash commands...
✅ Slash commands registered.
🤖 Logged in as ...
🌐 Express server listening on port 3000
```

---

## 7. Available Slash Commands

In your Discord server (where the bot is present), use:

### `/create-pr`
Create a new GitHub pull request.

- `branch` → head branch name (e.g. `feature/login`)
- `title` → PR title
- `body` → optional PR description

### `/approve-pr`
Approve a PR by number.

- `number` → PR number

### `/comment-pr`
Create an issue-style comment on the PR.

- `number` → PR number
- `text` → content

### `/merge-pr`
Merge a PR.

- `number` → PR number
- `method` → `merge` | `squash` | `rebase` (default: `merge`)

---

## 8. GitHub Webhook → Discord

1. Expose `http://localhost:3000/github/webhook` to the internet via e.g. **ngrok**:

   ```bash
   ngrok http 3000
   ```

2. In your GitHub repo settings:
   - **Settings → Webhooks → Add webhook**
   - Payload URL: `https://YOUR_NGROK_URL/github/webhook`
   - Content type: `application/json`
   - Select events:
     - `Pull requests`
     - `Pushes`
   - Save.

3. When GitHub sends events:
   - `pull_request` → bot posts PR opened/updated events
   - `push` → bot posts push + commit summary

Messages are sent to the channel specified by `DISCORD_CHANNEL_ID`.

---

## 9. Local Development (Optional)

```bash
npm install
npm start
```

Then use ngrok or an equivalent tunnel if you want GitHub webhooks.

---

## 10. Extending Workflows

Open `src/workflows.js` to add more automation, for example:

- Auto-request reviewers
- Auto-label PRs
- Auto-close stale PRs
- Trigger CI-related messages

Open `src/github.js` to add new GitHub operations (e.g. labels, branches, issues).

---

You now have a minimal **n8n-like GitHub ↔ Discord workflow engine**, fully Dockerized.
# githubbot
