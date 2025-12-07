# GitHub Discord Automation - Complete Code Explanation

## 🎯 What Does This Code Do?

This is a **GitHub ↔ Discord automation bridge** that connects your GitHub repository with Discord. It allows you to:
- **Manage PRs from Discord** (create, approve, comment, merge)
- **Receive GitHub notifications in Discord** (PR updates, push events)
- **Run as a containerized service** using Docker

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                     │
│  (Webscrapper)                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Sends webhooks for:
                     │ - Pull requests
                     │ - Push events
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│        THIS APPLICATION (Node.js + Express)             │
│  - Receives GitHub webhooks                             │
│  - Manages GitHub PRs via API                           │
│  - Sends Discord messages                              │
│  - Listens for Discord slash commands                  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴───────────┐
        │                        │
        ↓                        ↓
┌──────────────────┐      ┌──────────────────┐
│   DISCORD BOT    │      │   DISCORD CHAT   │
│  (slash commands)│      │   (notifications)│
└──────────────────┘      └──────────────────┘
```

---

## 📁 File-by-File Breakdown

### 1️⃣ **index.js** - Main Application File
**What it does:**
- Initializes the Express server
- Sets up Discord bot
- Registers Discord slash commands
- Handles Discord interactions (slash commands)
- Receives GitHub webhooks

**Key Components:**

#### a) Discord Bot Setup (Lines 1-30)
```javascript
const discordToken = process.env.DISCORD_TOKEN;
const discordClientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
```
- Loads Discord credentials from `.env`
- Creates a Discord client that connects to your server

#### b) Slash Commands (Lines 33-95)
Defines 5 Discord slash commands:

| Command | Purpose | Example |
|---------|---------|---------|
| `/create-pr` | Create a new GitHub PR | `/create-pr branch:feature/login title:"Add login page"` |
| `/approve-pr` | Approve an existing PR | `/approve-pr number:42` |
| `/comment-pr` | Add a comment to a PR | `/comment-pr number:42 text:"Looks good!"` |
| `/merge-pr` | Merge a PR | `/merge-pr number:42 method:squash` |
| `/create-branch` | Create a new GitHub branch | `/create-branch name:feature/new base:main` |

#### c) Command Handlers (Lines 130-200)
When you run a slash command in Discord:
1. User types `/create-pr`
2. Discord sends the command to the bot
3. Bot extracts parameters (branch, title, body)
4. Calls `github.createPR()` to create the PR
5. Returns success/error message to Discord

#### d) Express Server & Webhooks (Lines 215-250)
```javascript
app.post("/github/webhook", async (req, res) => {
  const eventName = req.headers["x-github-event"];  // "pull_request" or "push"
  const payload = req.body;                          // GitHub event data
  
  await workflows.handleGithubEvent(eventName, payload, client);
})
```
- Receives GitHub webhook events
- Passes them to `workflows.js` to post to Discord

---

### 2️⃣ **github.js** - GitHub API Operations
**What it does:**
- Connects to GitHub API using your PAT (Personal Access Token)
- Provides functions to interact with PRs and branches

**Functions:**

#### `createPR(branch, title, body)`
```
Input:  branch="feature/login", title="Add login page", body="Description"
Action: Creates a new PR from 'feature/login' branch to 'main'
Output: PR object with URL, number, status
Error:  Handles 404 (branch not found), 422 (PR exists), 401 (auth failed)
```

#### `approvePR(number)`
```
Input:  PR number (e.g., 42)
Action: Approves the PR (leaves an "APPROVE" review)
Error:  Handles 404 (PR not found), 422 (already merged/closed)
```

#### `commentPR(number, text)`
```
Input:  PR number and comment text
Action: Posts a comment on the PR
Error:  Handles 404 (PR not found)
```

#### `mergePR(number, method)`
```
Input:  PR number and merge method ("merge", "squash", or "rebase")
Action: Merges the PR into main branch
```

#### `createBranch(branchName, baseBranch)`
```
Input:  New branch name and base branch (default: "main")
Action: Creates a new branch from the base branch
Error:  Handles 404 (base not found), 422 (branch already exists)
```

---

### 3️⃣ **workflows.js** - GitHub Event Handler
**What it does:**
- Listens for GitHub webhook events
- Formats them nicely
- Posts them to Discord

**Events Handled:**

#### a) Pull Request Events (`pull_request`)
When you open/update/close a PR on GitHub:
```
GitHub sends: {
  action: "opened",
  pull_request: {
    number: 42,
    title: "Add login page",
    user: { login: "john" },
    html_url: "https://github.com/..."
  }
}

Discord receives:
📣 PR #42 **Add login page** (opened) by **john**
https://github.com/...
```

#### b) Push Events (`push`)
When you push commits:
```
GitHub sends: {
  ref: "refs/heads/main",
  commits: [
    { message: "Fix bug", id: "abc123..." },
    { message: "Add feature", id: "def456..." }
  ]
}

Discord receives:
🚀 Push to `main` in **paws1234/Webscrapper** by **paws1234**
- Fix bug (abc123)
- Add feature (def456)
```

---

### 4️⃣ **docker-compose.yml** - Docker Configuration
**What it does:**
- Defines how to run the app in a Docker container
- Maps port 3000 from container to host
- Loads `.env` file into the container

```yaml
services:
  app:
    build: .                          # Build from Dockerfile
    container_name: github-discord-automation
    restart: unless-stopped           # Auto-restart if crashes
    ports:
      - "${PORT:-3000}:3000"          # Port mapping
    env_file:
      - .env                          # Load environment variables
```

**In simple terms:**
- Packages your app in a container
- Runs it on port 3000
- Auto-restarts if it crashes
- Uses credentials from `.env`

---

### 5️⃣ **Dockerfile** - Container Image
**What it does:**
- Defines how to build the Docker image
- Sets up the environment

```dockerfile
FROM node:20-alpine              # Start with Node.js 20 on Alpine Linux
WORKDIR /app                     # Set working directory
COPY package.json ./             # Copy dependencies
RUN npm install --production     # Install only production dependencies
COPY . .                         # Copy your code
ENV NODE_ENV=production          # Set production environment
EXPOSE 3000                      # Expose port 3000
CMD ["node", "src/index.js"]     # Run the app
```

---

## 🔄 Complete Workflow Examples

### Example 1: Creating a PR from Discord
```
1. You in Discord: /create-pr branch:feature/login title:"Add login page"
2. Discord Bot receives the command
3. Calls: github.createPR("feature/login", "Add login page", "")
4. github.js → Creates PR via GitHub API
5. GitHub creates the PR
6. Discord shows: ✅ PR created: #42 - https://github.com/...
```

### Example 2: GitHub Webhook Notification
```
1. You push to main branch on GitHub
2. GitHub sends webhook event to: POST http://localhost:3000/github/webhook
3. index.js receives it
4. Calls: workflows.handleGithubEvent("push", payload, discordClient)
5. workflows.js formats the message
6. Posts to Discord channel: 🚀 Push to `main` with commits...
```

### Example 3: Merging a PR from Discord
```
1. You in Discord: /merge-pr number:42 method:squash
2. Discord Bot receives the command
3. Calls: github.mergePR(42, "squash")
4. github.js → Merges PR via GitHub API
5. GitHub merges the PR
6. Discord shows: ✅ PR #42 merged via `squash`
7. GitHub sends push webhook
8. Discord shows: 🚀 Push to `main`...
```

---

## 🔐 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DISCORD_TOKEN` | Bot authentication token | `MTQ0NzEwMDU5Nzc...` |
| `DISCORD_CLIENT_ID` | Bot application ID | `1447100597009518675` |
| `DISCORD_GUILD_ID` | Server (guild) ID | `1447102422379135026` |
| `DISCORD_CHANNEL_ID` | Channel for notifications | `1447102422811021458` |
| `GITHUB_TOKEN` | Personal Access Token | `github_pat_11A7NSBRY...` |
| `GITHUB_OWNER` | Your username/org | `paws1234` |
| `GITHUB_REPO` | Repository name | `Webscrapper` |
| `PORT` | Server port | `3000` |

---

## 🚀 How It All Works Together

```
STARTUP:
└─ Dockerfile builds the image
   └─ docker-compose.yml runs the container
      └─ Dockerfile runs: node src/index.js
         └─ index.js loads .env
            └─ Initializes Discord bot
            └─ Starts Express server on port 3000
            └─ Registers slash commands in Discord
            └─ Ready to handle requests

DISCORD COMMAND:
└─ User types: /create-pr
   └─ index.js receives interaction
      └─ Calls github.createPR()
         └─ github.js uses Octokit API
            └─ Creates PR on GitHub
            └─ Returns to Discord
               └─ Shows success message

GITHUB WEBHOOK:
└─ GitHub detects push/PR event
   └─ Sends webhook to: POST /github/webhook
      └─ index.js receives it
         └─ Calls workflows.handleGithubEvent()
            └─ workflows.js formats message
               └─ Sends to Discord channel
                  └─ Shows notification
```

---

## 📝 Summary

| Component | What It Does |
|-----------|-------------|
| **index.js** | Main app, Discord bot, slash commands, webhook receiver |
| **github.js** | GitHub API calls for PR/branch management |
| **workflows.js** | Formats GitHub events and posts to Discord |
| **Dockerfile** | Builds the container image |
| **docker-compose.yml** | Runs the container with settings |
| **.env** | Stores credentials (secret) |

**In one sentence:** This app lets you manage GitHub PRs and receive notifications through Discord slash commands and webhooks. 🎉
