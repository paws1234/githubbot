require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const github = require("./github");
const workflows = require("./workflows");
const setupRouter = require("./setupRouter");
const oauthRouter = require("./oauthRouter");
const db = require("./db");
const notifications = require("./notifications");

// Map to store active Discord clients
const activeClients = new Map();

// ---------------------
// Helper: Create Discord Bot for Setup
// ---------------------

async function createDiscordBot(setupConfig) {
  const {
    id,
    discordToken,
    discordClientId,
    discordGuildId,
    discordChannelId,
    githubToken,
    githubOwner,
    githubRepo
  } = setupConfig;

  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  // Store config on client instance
  client.setupConfig = setupConfig;

  const commands = [
  new SlashCommandBuilder()
    .setName("create-pr")
    .setDescription("Create a GitHub Pull Request")
    .addStringOption(o =>
      o.setName("branch")
        .setDescription("Branch name (head)")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Pull Request title")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("body")
        .setDescription("Optional PR description")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("approve-pr")
    .setDescription("Approve an existing GitHub PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("comment-pr")
    .setDescription("Add a comment to a GitHub PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("text")
        .setDescription("Comment text")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("merge-pr")
    .setDescription("Merge a GitHub PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("method")
        .setDescription("merge | squash | rebase")
        .setRequired(false)
    ),
    new SlashCommandBuilder()
  .setName("create-branch")
  .setDescription("Create a new GitHub branch from Discord")
  .addStringOption(o =>
    o.setName("name")
      .setDescription("New branch name")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("base")
      .setDescription("Base branch (default: main)")
      .setRequired(false)
  ),

  new SlashCommandBuilder()
    .setName("list-prs")
    .setDescription("List open pull requests")
    .addStringOption(o =>
      o.setName("state")
        .setDescription("PR state: open, closed, all")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("list-branches")
    .setDescription("List repository branches"),

  new SlashCommandBuilder()
    .setName("create-issue")
    .setDescription("Create a GitHub issue")
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Issue title")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("body")
        .setDescription("Issue description")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("pr-info")
    .setDescription("Get details about a specific PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("repo-info")
    .setDescription("Get repository information"),

  new SlashCommandBuilder()
    .setName("close-issue")
    .setDescription("Close a GitHub issue")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("Issue number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("reopen-issue")
    .setDescription("Reopen a closed GitHub issue")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("Issue number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("close-pr")
    .setDescription("Close a GitHub PR without merging")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("assign-pr")
    .setDescription("Request reviewers for a PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reviewers")
        .setDescription("GitHub usernames (comma-separated)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("list-issues")
    .setDescription("List repository issues")
    .addStringOption(o =>
      o.setName("state")
        .setDescription("Issue state: open, closed, all")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("issue-info")
    .setDescription("Get details about a specific issue")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("Issue number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("add-label")
    .setDescription("Add labels to an issue or PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("Issue/PR number")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("labels")
        .setDescription("Labels (comma-separated: bug,feature,docs)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("get-commits")
    .setDescription("Show recent commits")
    .addIntegerOption(o =>
      o.setName("limit")
        .setDescription("Number of commits (default: 10)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("create-release")
    .setDescription("Create a GitHub release")
    .addStringOption(o =>
      o.setName("tag")
        .setDescription("Release tag (e.g., v1.0.0)")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("body")
        .setDescription("Release notes")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("delete-branch")
    .setDescription("Delete a GitHub branch")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Branch name")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("git-setup")
    .setDescription("Get git commands to clone and set up repo"),

  new SlashCommandBuilder()
    .setName("git-branch-checkout")
    .setDescription("Get git checkout command for a branch")
    .addStringOption(o =>
      o.setName("branch")
        .setDescription("Branch name")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("git-push-command")
    .setDescription("Get git push command for a branch")
    .addStringOption(o =>
      o.setName("branch")
        .setDescription("Branch name")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("workflow-help")
    .setDescription("Show complete git workflow for branch work"),

  // NEW COMMANDS - Tier 1
  new SlashCommandBuilder()
    .setName("rename-branch")
    .setDescription("Rename a GitHub branch")
    .addStringOption(o =>
      o.setName("old_name")
        .setDescription("Current branch name")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("new_name")
        .setDescription("New branch name")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("compare-branches")
    .setDescription("Compare two branches (commits ahead/behind)")
    .addStringOption(o =>
      o.setName("base")
        .setDescription("Base branch")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("head")
        .setDescription("Compare branch")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("sync-branch")
    .setDescription("Sync branch with main (pull latest)")
    .addStringOption(o =>
      o.setName("branch")
        .setDescription("Branch name to sync")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("target")
        .setDescription("Target branch (default: main)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("assign-issue")
    .setDescription("Assign an issue to team members")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("Issue number")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("assignees")
        .setDescription("GitHub usernames (comma-separated)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("link-issue-pr")
    .setDescription("Link a PR to an issue (auto-close on merge)")
    .addIntegerOption(o =>
      o.setName("pr_number")
        .setDescription("PR number")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("issue_number")
        .setDescription("Issue number")
        .setRequired(true)
    ),

  // NEW COMMANDS - Tier 2
  new SlashCommandBuilder()
    .setName("request-changes")
    .setDescription("Request changes on a PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Review message/feedback")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("get-pr-diff")
    .setDescription("Show files changed in a PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("auto-merge-pr")
    .setDescription("Enable auto-merge on a PR")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("method")
        .setDescription("merge | squash | rebase")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("check-conflicts")
    .setDescription("Check if a PR has merge conflicts")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("protect-branch")
    .setDescription("Protect a branch (require checks + reviews)")
    .addStringOption(o =>
      o.setName("branch")
        .setDescription("Branch name to protect")
        .setRequired(true)
    ),

  // NEW COMMANDS - Tier 3
  new SlashCommandBuilder()
    .setName("code-review-status")
    .setDescription("List PRs awaiting review"),

  new SlashCommandBuilder()
    .setName("team-stats")
    .setDescription("Show team stats (PRs merged, issues closed, commits)"),

  new SlashCommandBuilder()
    .setName("deployment-status")
    .setDescription("Check latest deployment status"),

  new SlashCommandBuilder()
    .setName("rollback")
    .setDescription("Create a rollback release to previous version")
    .addStringOption(o =>
      o.setName("tag")
        .setDescription("Target release tag (e.g., v1.0.0)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("github-status")
    .setDescription("Check GitHub API status"),

  // SECURITY & AUDIT COMMANDS
  new SlashCommandBuilder()
    .setName("scan-secrets")
    .setDescription("Scan PR for leaked tokens, passwords, env files")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("PR number to scan")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("dependency-check")
    .setDescription("Check dependency vulnerabilities (npm, python, composer, ruby)"),

  new SlashCommandBuilder()
    .setName("audit-log")
    .setDescription("View audit logs of bot actions")
    .addStringOption(o =>
      o.setName("user")
        .setDescription("Filter by username (optional)")
        .setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName("days")
        .setDescription("Date range in days (default: 7, max: 365)")
        .setRequired(false)
    ),

  // DevOps & CI/CD COMMANDS
  new SlashCommandBuilder()
    .setName("run-ci")
    .setDescription("Trigger CI/CD pipeline on a branch")
    .addStringOption(o =>
      o.setName("branch")
        .setDescription("Branch name to run CI on")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ci-logs")
    .setDescription("Fetch GitHub Actions logs for a workflow run")
    .addStringOption(o =>
      o.setName("run_id")
        .setDescription("Workflow run ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("view-env")
    .setDescription("View sanitized environment config from a branch")
    .addStringOption(o =>
      o.setName("branch")
        .setDescription("Branch name (default: main)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("bump-version")
    .setDescription("Auto version bump with commit, tag, and release")
    .addStringOption(o =>
      o.setName("type")
        .setDescription("Bump type: patch, minor, or major")
        .setRequired(true)
        .addChoices(
          { name: 'Patch (0.0.X)', value: 'patch' },
          { name: 'Minor (0.X.0)', value: 'minor' },
          { name: 'Major (X.0.0)', value: 'major' }
        )
    ),

  // TASK MODE COMMANDS
  new SlashCommandBuilder()
    .setName("create-task")
    .setDescription("Create a task list and sync to GitHub issues")
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Task title")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("description")
        .setDescription("Task description (optional)")
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName("items")
        .setDescription("Task items (comma-separated: item1, item2, item3)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("task-list")
    .setDescription("View all synced tasks from GitHub"),

  new SlashCommandBuilder()
    .setName("task-progress")
    .setDescription("Update task progress")
    .addIntegerOption(o =>
      o.setName("issue_number")
        .setDescription("Issue number of the task")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("completed")
        .setDescription("Number of completed tasks")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("total")
        .setDescription("Total number of tasks")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("close-task")
    .setDescription("Close a task")
    .addIntegerOption(o =>
      o.setName("issue_number")
        .setDescription("Issue number of the task")
        .setRequired(true)
    ),

  // ANALYTICS & METRICS COMMANDS
  new SlashCommandBuilder()
    .setName("sprint-stats")
    .setDescription("Show sprint burndown stats (open/closed PRs, velocity)")
    .addIntegerOption(o =>
      o.setName("week")
        .setDescription("Week offset (0 = current week, -1 = last week)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("dev-metrics")
    .setDescription("Developer productivity metrics (not for punishment!)")
    .addStringOption(o =>
      o.setName("user")
        .setDescription("GitHub username")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("stale-prs")
    .setDescription("Find stale PRs stuck for 1+ days and create improvement tasks")

].map(c => c.toJSON());

async function registerCommands() {
  if (!discordToken || !discordClientId || !guildId) return;

  const rest = new REST({ version: "10" }).setToken(discordToken);

  try {
    console.log("🔧 Registering Discord slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(discordClientId, guildId),
      { body: commands }
    );
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("Failed to register slash commands:", err);
  }
}

client.on("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// Handle slash commands
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      // Get setup config from client
      const { discordToken, githubToken, githubOwner, githubRepo } = client.setupConfig || {};
      
      if (!discordToken || !githubToken || !githubOwner || !githubRepo) {
        return interaction.reply({ content: "❌ Setup not configured properly", ephemeral: true });
      }

      if (interaction.commandName === "create-pr") {
        const branch = interaction.options.getString("branch", true);
        const title = interaction.options.getString("title", true);
        const body = interaction.options.getString("body") || "";

        await interaction.deferReply({ ephemeral: false });
        try {
          const pr = await github.createPR(githubToken, githubOwner, githubRepo, branch, title, body);
          await interaction.editReply(`✅ PR created: #${pr.number} - ${pr.html_url}`);
          
          // Send notification to channel
          const embed = notifications.createPRNotification(pr.number, title, branch, interaction.user.username, pr.html_url);
          await notifications.sendNotification(client, discordChannelId, embed);
        } catch (err) {
          await interaction.editReply(`❌ Failed to create PR: ${err.message}`);
        }
      }

      if (interaction.commandName === "approve-pr") {
        const number = interaction.options.getInteger("number", true);
        await interaction.deferReply({ ephemeral: false });
        try {
          const pr = await github.getPRInfo(githubToken, githubOwner, githubRepo, number);
          await github.approvePR(githubToken, githubOwner, githubRepo, number);
          await interaction.editReply(`👍 Approved PR #${number}`);
          
          // Send notification to channel
          const embed = notifications.approvePRNotification(number, pr.title, interaction.user.username, pr.html_url);
          await notifications.sendNotification(client, discordChannelId, embed);
        } catch (err) {
          await interaction.editReply(`❌ Failed to approve PR: ${err.message}`);
        }
      }

      if (interaction.commandName === "comment-pr") {
        const number = interaction.options.getInteger("number", true);
        const text = interaction.options.getString("text", true);
        await interaction.deferReply({ ephemeral: false });
        try {
          await github.commentPR(githubToken, githubOwner, githubRepo, number, text);
          await interaction.editReply(`💬 Comment posted on PR #${number}`);
        } catch (err) {
          await interaction.editReply(`❌ Failed to post comment: ${err.message}`);
        }
      }

      if (interaction.commandName === "merge-pr") {
        const number = interaction.options.getInteger("number", true);
        const method = interaction.options.getString("method") || "merge";
        await interaction.deferReply({ ephemeral: false });
        try {
          const pr = await github.getPRInfo(githubToken, githubOwner, githubRepo, number);
          const res = await github.mergePR(githubToken, githubOwner, githubRepo, number, method);
          if (res.merged) {
            await interaction.editReply(`✅ PR #${number} merged via \`${method}\``);
            
            // Send notification to channel
            const embed = notifications.mergePRNotification(number, pr.title, method, interaction.user.username, pr.html_url);
            await notifications.sendNotification(client, discordChannelId, embed);
          } else {
            await interaction.editReply(`⚠️ Failed to merge PR #${number}: ${res.message || "unknown error"}`);
          }
        } catch (err) {
          await interaction.editReply(`❌ Failed to merge PR: ${err.message}`);
        }
      }

      if (interaction.commandName === "create-branch") {
        const name = interaction.options.getString("name", true);
        const base = interaction.options.getString("base") || "main";

        try {
          await interaction.deferReply();
          const result = await github.createBranch(githubToken, githubOwner, githubRepo, name, base);
          const branchUrl = `https://github.com/${githubOwner}/${githubRepo}/tree/${name}`;
          await interaction.editReply(`🌿 Branch **${name}** created from **${base}** successfully!\n${branchUrl}`);
          
          // Send notification to channel
          const embed = notifications.createBranchNotification(name, base, interaction.user.username, branchUrl);
          await notifications.sendNotification(client, discordChannelId, embed);
        } catch (err) {
          console.error(err);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ Failed to create branch: ${err.message}`, ephemeral: true });
          } else if (interaction.deferred) {
            await interaction.editReply(`❌ Failed to create branch: ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "list-prs") {
        const state = interaction.options.getString("state") || "open";
        try {
          await interaction.deferReply();
          const prs = await github.listPRs(githubToken, githubOwner, githubRepo, state);
          if (prs.length === 0) {
            await interaction.editReply(`📭 No ${state} PRs found`);
          } else {
            const prList = prs.map(pr => `#${pr.number} - ${pr.title} (${pr.state})`).join('\n');
            await interaction.editReply(`📋 **${state.toUpperCase()} PRs** in ${githubOwner}/${githubRepo}:\n\`\`\`\n${prList}\n\`\`\``);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "list-branches") {
        try {
          await interaction.deferReply();
          const branches = await github.listBranches(githubToken, githubOwner, githubRepo);
          if (branches.length === 0) {
            await interaction.editReply(`🌿 No branches found`);
          } else {
            const branchList = branches.map(b => b.name).join('\n');
            await interaction.editReply(`🌿 **Branches** in ${githubOwner}/${githubRepo}:\n\`\`\`\n${branchList}\n\`\`\``);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "create-issue") {
        const title = interaction.options.getString("title", true);
        const body = interaction.options.getString("body") || "";
        try {
          await interaction.deferReply();
          const issue = await github.createIssue(githubToken, githubOwner, githubRepo, title, body);
          const issueUrl = `https://github.com/${githubOwner}/${githubRepo}/issues/${issue.number}`;
          await interaction.editReply(`🐛 Issue #${issue.number} created: ${title}\n${issueUrl}`);
          
          // Send notification to channel
          const embed = notifications.createIssueNotification(issue.number, title, interaction.user.username, issueUrl);
          await notifications.sendNotification(client, discordChannelId, embed);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "pr-info") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          const pr = await github.getPRInfo(githubToken, githubOwner, githubRepo, number);
          const info = `**#${pr.number}** - ${pr.title}\n**State:** ${pr.state}\n**Author:** ${pr.user.login}\n**Created:** ${new Date(pr.created_at).toDateString()}\n**URL:** ${pr.html_url}`;
          await interaction.editReply(info);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "repo-info") {
        try {
          await interaction.deferReply();
          const repo = await github.getRepoInfo(githubToken, githubOwner, githubRepo);
          const info = `**${repo.full_name}**\n**Stars:** ⭐ ${repo.stargazers_count}\n**Forks:** 🍴 ${repo.forks_count}\n**Language:** ${repo.language || "N/A"}\n**URL:** ${repo.html_url}`;
          await interaction.editReply(info);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "close-issue") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          const issue = await github.getIssueInfo(githubToken, githubOwner, githubRepo, number);
          await github.closeIssue(githubToken, githubOwner, githubRepo, number);
          await interaction.editReply(`✅ Issue #${number} closed`);
          
          // Send notification to channel
          const embed = notifications.closeIssueNotification(number, issue.title, interaction.user.username, issue.html_url);
          await notifications.sendNotification(client, discordChannelId, embed);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "reopen-issue") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          await github.reopenIssue(githubToken, githubOwner, githubRepo, number);
          await interaction.editReply(`🔄 Issue #${number} reopened`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "close-pr") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          await github.closePR(githubToken, githubOwner, githubRepo, number);
          await interaction.editReply(`✅ PR #${number} closed`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "assign-pr") {
        const number = interaction.options.getInteger("number", true);
        const reviewersStr = interaction.options.getString("reviewers", true);
        const reviewers = reviewersStr.split(",").map(r => r.trim());
        try {
          await interaction.deferReply();
          await github.assignPR(githubToken, githubOwner, githubRepo, number, reviewers);
          await interaction.editReply(`👥 Requested review from: ${reviewers.join(", ")}`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "list-issues") {
        const state = interaction.options.getString("state") || "open";
        try {
          await interaction.deferReply();
          const issues = await github.listIssues(githubToken, githubOwner, githubRepo, state);
          if (issues.length === 0) {
            await interaction.editReply(`📭 No ${state} issues found`);
          } else {
            const issueList = issues.map(i => `#${i.number} - ${i.title}`).join('\n');
            await interaction.editReply(`📋 **${state.toUpperCase()} ISSUES** in ${githubOwner}/${githubRepo}:\n\`\`\`\n${issueList}\n\`\`\``);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "issue-info") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          const issue = await github.getIssueInfo(githubToken, githubOwner, githubRepo, number);
          const info = `**#${issue.number}** - ${issue.title}\n**State:** ${issue.state}\n**Author:** ${issue.user.login}\n**Created:** ${new Date(issue.created_at).toDateString()}\n**URL:** ${issue.html_url}`;
          await interaction.editReply(info);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "add-label") {
        const number = interaction.options.getInteger("number", true);
        const labelsStr = interaction.options.getString("labels", true);
        const labels = labelsStr.split(",").map(l => l.trim());
        try {
          await interaction.deferReply();
          await github.addLabel(githubToken, githubOwner, githubRepo, number, labels);
          await interaction.editReply(`🏷️ Added labels: ${labels.join(", ")}`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "get-commits") {
        const limit = interaction.options.getInteger("limit") || 10;
        try {
          await interaction.deferReply();
          const commits = await github.getCommits(githubToken, githubOwner, githubRepo, limit);
          if (commits.length === 0) {
            await interaction.editReply(`📭 No commits found`);
          } else {
            const commitList = commits.map(c => `${c.commit.message.split('\n')[0]} (${c.author?.login || "unknown"})`).join('\n');
            await interaction.editReply(`📚 **RECENT COMMITS**:\n\`\`\`\n${commitList}\n\`\`\``);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "create-release") {
        const tag = interaction.options.getString("tag", true);
        const body = interaction.options.getString("body") || "";
        try {
          await interaction.deferReply();
          const release = await github.createRelease(githubToken, githubOwner, githubRepo, tag, body);
          await interaction.editReply(`🎉 Release **${tag}** created!\n${release.html_url}`);
          
          // Send notification to channel
          const embed = notifications.createReleaseNotification(tag, release.name, interaction.user.username, release.html_url);
          await notifications.sendNotification(client, discordChannelId, embed);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "delete-branch") {
        const name = interaction.options.getString("name", true);
        try {
          await interaction.deferReply();
          await github.deleteBranch(githubToken, githubOwner, githubRepo, name);
          await interaction.editReply(`🗑️ Branch **${name}** deleted`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "git-setup") {
        try {
          const cloneCmd = github.getCloneCommand(githubOwner, githubRepo);
          const pullCmd = github.getPullCommand();
          const setup = `\`\`\`bash\n# Clone the repository\n${cloneCmd}\n\n# Navigate to the repo\ncd ${githubRepo}\n\n# Ensure you're on main branch and up to date\ngit checkout main\n${pullCmd}\n\`\`\``;
          await interaction.reply(setup);
        } catch (err) {
          await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
        }
      }

      if (interaction.commandName === "git-branch-checkout") {
        const branch = interaction.options.getString("branch", true);
        try {
          const checkoutCmd = github.getCheckoutCommand(branch);
          const command = `\`\`\`bash\n${checkoutCmd}\n\`\`\``;
          await interaction.reply(`📌 **Checkout command for branch \`${branch}\`**:\n${command}`);
        } catch (err) {
          await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
        }
      }

      if (interaction.commandName === "git-push-command") {
        const branch = interaction.options.getString("branch", true);
        try {
          const pushCmd = github.getPushCommand(branch);
          const command = `\`\`\`bash\n${pushCmd}\n\`\`\``;
          await interaction.reply(`📤 **Push command for branch \`${branch}\`**:\n${command}\n\nThen create a PR on GitHub!`);
        } catch (err) {
          await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
        }
      }

      if (interaction.commandName === "workflow-help") {
        try {
          const workflow = `
📚 **COMPLETE GIT WORKFLOW:**

1️⃣ **Clone & Setup:**
\`\`\`bash
${github.getCloneCommand(githubOwner, githubRepo)}
cd ${githubRepo}
${github.getPullCommand()}
\`\`\`

2️⃣ **Create a new branch:**
Use: \`/create-branch name:feature-name base:main\`

3️⃣ **Checkout the branch locally:**
\`\`\`bash
${github.getCheckoutCommand("your-branch-name")}
\`\`\`

4️⃣ **Make your changes and commit:**
\`\`\`bash
git add .
git commit -m "description of your changes"
\`\`\`

5️⃣ **Push to GitHub:**
\`\`\`bash
${github.getPushCommand("your-branch-name")}
\`\`\`

6️⃣ **Create a PR:**
Use: \`/create-pr branch:your-branch-name title:"PR title"\`

7️⃣ **Request review:**
Use: \`/assign-pr number:# reviewers:username1,username2\`

8️⃣ **Merge when approved:**
Use: \`/merge-pr number:# method:squash\`

✅ Done!
`;
          await interaction.reply(workflow);
        } catch (err) {
          await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
        }
      }

      // NEW COMMAND HANDLERS

      if (interaction.commandName === "rename-branch") {
        const oldName = interaction.options.getString("old_name", true);
        const newName = interaction.options.getString("new_name", true);
        try {
          await interaction.deferReply();
          const result = await github.renameBranch(githubToken, githubOwner, githubRepo, oldName, newName);
          await interaction.editReply(`✅ Branch renamed: **${oldName}** → **${newName}**`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "compare-branches") {
        const base = interaction.options.getString("base", true);
        const head = interaction.options.getString("head", true);
        try {
          await interaction.deferReply();
          const comparison = await github.compareBranches(githubToken, githubOwner, githubRepo, base, head);
          const ahead = comparison.ahead_by || 0;
          const behind = comparison.behind_by || 0;
          const message = `📊 **Comparison: ${base}...${head}**\n\n**Ahead:** ${ahead} commits\n**Behind:** ${behind} commits\n\n${comparison.total_commits > 0 ? `Total commits: ${comparison.total_commits}` : "No differences"}`;
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "sync-branch") {
        const branch = interaction.options.getString("branch", true);
        const target = interaction.options.getString("target") || "main";
        try {
          await interaction.deferReply();
          const result = await github.syncBranch(githubToken, githubOwner, githubRepo, branch, target);
          await interaction.editReply(`✅ Branch **${branch}** synced with **${target}**`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "assign-issue") {
        const number = interaction.options.getInteger("number", true);
        const assigneesStr = interaction.options.getString("assignees", true);
        const assignees = assigneesStr.split(",").map(a => a.trim());
        try {
          await interaction.deferReply();
          const issue = await github.assignIssue(githubToken, githubOwner, githubRepo, number, assignees);
          const assignedTo = assignees.join(", ");
          await interaction.editReply(`✅ Issue #${number} assigned to: ${assignedTo}`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "link-issue-pr") {
        const prNumber = interaction.options.getInteger("pr_number", true);
        const issueNumber = interaction.options.getInteger("issue_number", true);
        try {
          await interaction.deferReply();
          const result = await github.linkIssueToPR(githubToken, githubOwner, githubRepo, prNumber, issueNumber);
          await interaction.editReply(`🔗 PR #${prNumber} linked to issue #${issueNumber}\n\nIssue will auto-close when PR merges!`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "request-changes") {
        const number = interaction.options.getInteger("number", true);
        const message = interaction.options.getString("message") || "Changes requested";
        try {
          await interaction.deferReply();
          const review = await github.requestChanges(githubToken, githubOwner, githubRepo, number, message);
          await interaction.editReply(`❌ Changes requested on PR #${number}\n\n**Feedback:** ${message}`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "get-pr-diff") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          const files = await github.getPRDiff(githubToken, githubOwner, githubRepo, number);
          if (files.length === 0) {
            await interaction.editReply(`📭 No files changed in PR #${number}`);
          } else {
            const fileList = files.map(f => `\`${f.filename}\` (+${f.additions} -${f.deletions})`).join('\n');
            await interaction.editReply(`📝 **Files changed in PR #${number}:**\n${fileList}`);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "auto-merge-pr") {
        const number = interaction.options.getInteger("number", true);
        const method = interaction.options.getString("method") || "merge";
        try {
          await interaction.deferReply();
          const result = await github.autoMergePR(githubToken, githubOwner, githubRepo, number, method);
          await interaction.editReply(`✅ Auto-merge enabled on PR #${number} (method: ${method})\n\nPR will merge automatically when all checks pass!`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "check-conflicts") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          const conflicts = await github.checkMergeConflicts(githubToken, githubOwner, githubRepo, number);
          if (conflicts.mergeable) {
            await interaction.editReply(`✅ PR #${number} has no merge conflicts and is ready to merge!`);
          } else {
            await interaction.editReply(`⚠️ PR #${number} has merge conflicts\n**Status:** ${conflicts.mergeableState}\n\nResolve conflicts on GitHub before merging.`);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "protect-branch") {
        const branch = interaction.options.getString("branch", true);
        try {
          await interaction.deferReply();
          const result = await github.protectBranch(githubToken, githubOwner, githubRepo, branch);
          await interaction.editReply(`🛡️ Branch **${branch}** is now protected!\n\n✓ Require status checks\n✓ Require pull request reviews (1 approval)\n✓ Dismiss stale reviews\n✓ Enforce for admins`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "code-review-status") {
        try {
          await interaction.deferReply();
          const prs = await github.getCodeReviewStatus(githubToken, githubOwner, githubRepo);
          if (prs.length === 0) {
            await interaction.editReply(`✅ No PRs awaiting review!`);
          } else {
            const prList = prs.map(pr => `#${pr.number} - ${pr.title} (requested: ${pr.requested_reviewers?.length || 0} reviewers)`).join('\n');
            await interaction.editReply(`👀 **PRs Awaiting Review:**\n${prList}`);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "team-stats") {
        try {
          await interaction.deferReply();
          const stats = await github.getTeamStats(githubToken, githubOwner, githubRepo);
          const message = `📊 **Team Stats (${stats.period}):**\n\n✅ PRs Merged: ${stats.prsMerged}\n🐛 Issues Closed: ${stats.issuesClosed}\n📝 Commits: ${stats.commitsThisWeek}`;
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "deployment-status") {
        try {
          await interaction.deferReply();
          const deployment = await github.getDeploymentStatus(githubToken, githubOwner, githubRepo);
          if (deployment.status === "No deployments found") {
            await interaction.editReply(`📭 No deployments found`);
          } else {
            const message = `🚀 **Latest Deployment:**\n\n**Environment:** ${deployment.latestDeployment.environment}\n**Status:** ${deployment.status}\n**Ref:** ${deployment.latestDeployment.ref}\n**Created by:** ${deployment.latestDeployment.creator}\n**Time:** ${new Date(deployment.latestDeployment.createdAt).toLocaleString()}`;
            await interaction.editReply(message);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "rollback") {
        const tag = interaction.options.getString("tag", true);
        try {
          await interaction.deferReply();
          const rollback = await github.createRollback(githubToken, githubOwner, githubRepo, tag);
          await interaction.editReply(`↩️ Rollback release created!\n\n**Target:** ${tag}\n**New Release:** ${rollback.tag_name}\n**URL:** ${rollback.html_url}`);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "github-status") {
        try {
          await interaction.deferReply();
          const status = await github.getGitHubStatus(githubToken);
          if (status.status === "operational") {
            await interaction.editReply(`✅ GitHub is operational!\n\n📊 Status Page: ${status.statusPage}`);
          } else {
            await interaction.editReply(`⚠️ GitHub status unknown\n\n📊 Check: ${status.statusPage}`);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      // SECURITY & AUDIT COMMANDS

      if (interaction.commandName === "scan-secrets") {
        const number = interaction.options.getInteger("number", true);
        try {
          await interaction.deferReply();
          const scanResult = await github.scanPRForSecrets(githubToken, githubOwner, githubRepo, number);
          
          if (scanResult.secretsFound || scanResult.envFiles.length > 0) {
            let message = `🔴 **${scanResult.status}** for PR #${number}\n\n`;
            
            if (scanResult.envFiles.length > 0) {
              message += `📄 **Env Files Detected:**\n${scanResult.envFiles.map(f => `\`${f}\``).join('\n')}\n\n`;
            }
            
            if (scanResult.secrets.length > 0) {
              message += `🔑 **Potential Secrets Found:**\n`;
              scanResult.secrets.forEach(secret => {
                message += `• \`${secret.type}\` in \`${secret.file}\` (${secret.count} match${secret.count > 1 ? 'es' : ''})\n`;
              });
            }
            
            message += `\n⚠️ **Action Required:** Review and rotate any exposed credentials immediately!`;
            await interaction.editReply(message);
          } else {
            await interaction.editReply(`✅ **${scanResult.status}** - No secrets detected in PR #${number}`);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "dependency-check") {
        try {
          await interaction.deferReply();
          const depCheck = await github.checkDependencyVulnerabilities(githubToken, githubOwner, githubRepo);
          
          let message = `📦 **Dependency Vulnerability Check** for ${depCheck.repo}\n\n`;
          
          for (const [lang, info] of Object.entries(depCheck.dependencies)) {
            const icon = info.hasLockFile ? '✅' : '⚪';
            message += `${icon} **${lang.toUpperCase()}:** ${info.status}\n`;
          }
          
          message += `\n💡 **${depCheck.recommendation}**`;
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "audit-log") {
        const user = interaction.options.getString("user");
        const days = interaction.options.getInteger("days") || 7;
        
        try {
          await interaction.deferReply();
          const logs = await github.getAuditLogs(githubToken, githubOwner, githubRepo, user, days);
          
          if (logs.logs.length === 0) {
            await interaction.editReply(`📭 No audit logs found for ${user ? `user \`${user}\`` : 'any user'} in the last ${days} days`);
          } else {
            let message = `📋 **Audit Logs** - ${logs.repo}\n`;
            message += `**Period:** ${logs.period}\n`;
            message += `**Filter:** ${logs.userFilter}\n`;
            message += `**Total Events:** ${logs.totalEvents}\n\n`;
            
            message += `**Recent Activity:**\n`;
            logs.logs.slice(0, 15).forEach(log => {
              const emoji = log.type === 'commit' ? '📝' : log.type === 'pull_request' ? '🔀' : '🐛';
              const actionColor = log.action === 'OPEN' ? '🟢' : log.action === 'CLOSED' ? '🔴' : '🟡';
              message += `${emoji} **${log.action}** by \`${log.author}\` - ${log.details}\n`;
            });
            
            if (logs.logs.length > 15) {
              message += `\n... and ${logs.logs.length - 15} more events`;
            }
            
            await interaction.editReply(message);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      // DevOps & CI/CD COMMAND HANDLERS

      if (interaction.commandName === "run-ci") {
        const branch = interaction.options.getString("branch", true);
        try {
          await interaction.deferReply();
          const result = await github.triggerCI(githubToken, githubOwner, githubRepo, branch);
          await interaction.editReply(`✅ ${result.message}\n\n**Workflow:** ${result.workflowName}\n**Branch:** \`${result.branch}\``);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "ci-logs") {
        const runId = interaction.options.getString("run_id", true);
        try {
          await interaction.deferReply();
          const logs = await github.getCILogs(githubToken, githubOwner, githubRepo, runId);
          
          let message = `🔧 **CI/CD Workflow Logs** - Run #${logs.runId}\n\n`;
          message += `**Workflow:** ${logs.workflowName}\n`;
          message += `**Status:** ${logs.status}\n`;
          message += `**Conclusion:** ${logs.conclusion || 'In Progress'}\n`;
          message += `**Branch:** \`${logs.branch}\`\n`;
          message += `**Created:** ${new Date(logs.createdAt).toLocaleString()}\n\n`;
          
          message += `**Jobs:**\n`;
          logs.jobs.forEach(job => {
            const statusEmoji = job.status === 'completed' ? '✅' : job.status === 'in_progress' ? '⏳' : '⏹️';
            const conclusionEmoji = job.conclusion === 'success' ? '✅' : job.conclusion === 'failure' ? '❌' : job.conclusion === 'skipped' ? '⏭️' : '❓';
            message += `${statusEmoji} **${job.jobName}** - ${job.conclusion ? conclusionEmoji : 'Running'}\n`;
          });
          
          message += `\n📖 [View Full Logs](${logs.htmlUrl})`;
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "view-env") {
        const branch = interaction.options.getString("branch") || "main";
        try {
          await interaction.deferReply();
          const config = await github.viewEnvironmentConfig(githubToken, githubOwner, githubRepo, branch);
          
          let message = `⚙️ **Environment Configuration** - ${config.repo}\n`;
          message += `**Branch:** \`${config.branch}\`\n\n`;
          
          message += `📄 **.env File Status:**\n`;
          message += config.envFileExists ? '✅ Found\n' : '❌ Not found\n';
          
          if (config.envFileExists) {
            message += `\`\`\`\n${config.sanitizedEnv}\n\`\`\`\n\n`;
          }
          
          if (config.envExampleContent && config.envExampleContent !== 'No .env.example file found') {
            message += `📋 **.env.example:**\n\`\`\`\n${config.envExampleContent.substring(0, 500)}\n\`\`\`\n`;
          }
          
          message += `\n${config.note}`;
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "bump-version") {
        const type = interaction.options.getString("type", true);
        try {
          await interaction.deferReply();
          const result = await github.bumpVersion(githubToken, githubOwner, githubRepo, type);
          
          let message = `📦 **Version Bumped Successfully!**\n\n`;
          message += `**Previous:** ${result.previousVersion}\n`;
          message += `**New:** ${result.newVersion}\n`;
          message += `**Type:** ${result.bumpType.toUpperCase()}\n\n`;
          message += `✅ ${result.status}\n`;
          message += `📖 [View Release](${result.releaseUrl})`;
          
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      // TASK MODE HANDLERS

      if (interaction.commandName === "create-task") {
        const title = interaction.options.getString("title", true);
        const description = interaction.options.getString("description") || "";
        const itemsStr = interaction.options.getString("items") || "";
        const items = itemsStr ? itemsStr.split(",").map(item => item.trim()).filter(item => item) : [];

        try {
          await interaction.deferReply();
          const result = await github.createTaskIssue(githubToken, githubOwner, githubRepo, title, description, items);
          
          let message = `✅ **Task Created & Synced to GitHub!**\n\n`;
          message += `**Title:** ${result.issueTitle}\n`;
          message += `**Issue:** #${result.issueNumber}\n`;
          message += `**Tasks:** ${result.taskCount} items\n\n`;
          message += `🔗 [View on GitHub](${result.issueUrl})`;
          
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "task-list") {
        try {
          await interaction.deferReply();
          const result = await github.getTaskList(githubToken, githubOwner, githubRepo);
          
          if (result.tasks.length === 0) {
            await interaction.editReply(`📭 No tasks found in ${result.repo}`);
          } else {
            let message = `📋 **Task Dashboard** - ${result.repo}\n\n`;
            message += `**Open:** ${result.openTasks} | **Closed:** ${result.closedTasks}\n\n`;
            
            // Show first 15 tasks
            result.tasks.slice(0, 15).forEach(task => {
              const statusEmoji = task.state === 'open' ? '🟢' : '🔴';
              const progressBar = `[${'█'.repeat(Math.round(task.progressPercent / 10))}${' '.repeat(10 - Math.round(task.progressPercent / 10))}]`;
              message += `${statusEmoji} **#${task.issueNumber}** - ${task.title}\n`;
              message += `   ${progressBar} ${task.progressPercent}% (${task.completedTasks}/${task.totalTasks})\n`;
              message += `   by ${task.author} · ${new Date(task.updatedAt).toLocaleDateString()}\n\n`;
            });
            
            if (result.tasks.length > 15) {
              message += `... and ${result.tasks.length - 15} more tasks`;
            }
            
            await interaction.editReply(message);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "task-progress") {
        const issueNumber = interaction.options.getInteger("issue_number", true);
        const completed = interaction.options.getInteger("completed", true);
        const total = interaction.options.getInteger("total", true);

        try {
          await interaction.deferReply();
          const result = await github.updateTaskProgress(githubToken, githubOwner, githubRepo, issueNumber, completed, total);
          
          const progressBar = `[${'█'.repeat(Math.round(result.progressPercent / 10))}${' '.repeat(10 - Math.round(result.progressPercent / 10))}]`;
          let message = `📊 **Task Progress Updated!**\n\n`;
          message += `**Issue:** #${result.issueNumber}\n`;
          message += `${progressBar} ${result.progressPercent}%\n`;
          message += `**Progress:** ${result.completedTasks}/${result.totalTasks} tasks completed`;
          
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "close-task") {
        const issueNumber = interaction.options.getInteger("issue_number", true);

        try {
          await interaction.deferReply();
          const result = await github.closeTask(githubToken, githubOwner, githubRepo, issueNumber);
          
          let message = `✅ **Task Completed & Closed!**\n\n`;
          message += `**Issue:** #${result.issueNumber}\n`;
          message += `**Title:** ${result.title}\n`;
          message += `**Status:** ${result.state.toUpperCase()}\n\n`;
          message += `🔗 [View on GitHub](${result.url})`;
          
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      // ANALYTICS & METRICS HANDLERS

      if (interaction.commandName === "sprint-stats") {
        const weekOffset = interaction.options.getInteger("week") || 0;
        try {
          await interaction.deferReply();
          const stats = await github.getSprintStats(githubToken, githubOwner, githubRepo, weekOffset);
          
          let message = `📊 **Sprint Statistics** - ${stats.repo}\n`;
          message += `**Period:** ${stats.period}\n\n`;
          message += `📈 **Burndown:**\n`;
          message += `🟢 PRs Open: ${stats.prsOpen}\n`;
          message += `✅ PRs Closed: ${stats.prsClosed}\n`;
          message += `🐛 Issues Open: ${stats.issuesOpen}\n`;
          message += `✅ Issues Closed: ${stats.issuesClosed}\n\n`;
          message += `💨 **Velocity:** ${stats.velocity} (PRs closed + Issues closed)\n\n`;
          
          if (Object.keys(stats.issuesByUser).length > 0) {
            message += `👥 **Issues Closed by User:**\n`;
            Object.entries(stats.issuesByUser)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .forEach(([user, count]) => {
                message += `• \`${user}\`: ${count} issues\n`;
              });
          }
          
          if (stats.topContributor) {
            message += `\n⭐ **Top Contributor:** ${stats.topContributor[0]} (${stats.topContributor[1]} issues)`;
          }
          
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "dev-metrics") {
        const user = interaction.options.getString("user", true);
        try {
          await interaction.deferReply();
          const metrics = await github.getDeveloperMetrics(githubToken, githubOwner, githubRepo, user);
          
          let message = `📈 **Developer Metrics** - ${user}\n`;
          message += `**Repo:** ${metrics.repo}\n\n`;
          message += `📝 **PR Stats:**\n`;
          message += `✅ Merged: ${metrics.prsMerged}\n`;
          message += `🔄 Open: ${metrics.prsOpen}\n\n`;
          message += `🐛 **Issues Closed:** ${metrics.issuesClosed}\n\n`;
          message += `👀 **Code Review Metrics:**\n`;
          message += `⏱️ Avg Review Turnaround: ${metrics.reviewTurnaroundHours} hours\n`;
          message += `💬 Reviews Given: ${metrics.reviewsGiven}\n\n`;
          message += `⭐ **Productivity Score:** ${metrics.productivity.toFixed(1)}`;
          
          await interaction.editReply(message);
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

      if (interaction.commandName === "stale-prs") {
        try {
          await interaction.deferReply();
          const result = await github.getStalePRs(githubToken, githubOwner, githubRepo);
          
          if (result.totalStale === 0) {
            await interaction.editReply(`✅ No stale PRs found in ${result.repo}`);
          } else {
            let message = `⚠️ **Stale PRs Report** - ${result.repo}\n`;
            message += `**Total Stale:** ${result.totalStale} PRs\n\n`;
            
            // 1 day
            if (result.stalePRs.oneDay.length > 0) {
              message += `🟡 **1+ Days Old (${result.stalePRs.oneDay.length}):**\n`;
              result.stalePRs.oneDay.slice(0, 3).forEach(pr => {
                message += `#${pr.number} - ${pr.title.substring(0, 50)} (@${pr.author}, ${pr.daysOld}d)\n`;
              });
              if (result.stalePRs.oneDay.length > 3) message += `... +${result.stalePRs.oneDay.length - 3} more\n`;
              message += '\n';
            }
            
            // 3 days
            if (result.stalePRs.threeDays.length > 0) {
              message += `🟠 **3+ Days Old (${result.stalePRs.threeDays.length}):**\n`;
              result.stalePRs.threeDays.slice(0, 3).forEach(pr => {
                message += `#${pr.number} - ${pr.title.substring(0, 50)} (@${pr.author}, ${pr.daysOld}d)\n`;
              });
              if (result.stalePRs.threeDays.length > 3) message += `... +${result.stalePRs.threeDays.length - 3} more\n`;
              message += '\n';
            }
            
            // 1 week
            if (result.stalePRs.oneWeek.length > 0) {
              message += `🔴 **7+ Days Old (${result.stalePRs.oneWeek.length}):**\n`;
              result.stalePRs.oneWeek.slice(0, 3).forEach(pr => {
                message += `#${pr.number} - ${pr.title.substring(0, 50)} (@${pr.author}, ${pr.daysOld}d)\n`;
              });
              if (result.stalePRs.oneWeek.length > 3) message += `... +${result.stalePRs.oneWeek.length - 3} more\n`;
              message += '\n';
            }
            
            // 1+ week
            if (result.stalePRs.older.length > 0) {
              message += `💀 **7+ Days Old (${result.stalePRs.older.length}):**\n`;
              result.stalePRs.older.slice(0, 3).forEach(pr => {
                message += `#${pr.number} - ${pr.title.substring(0, 50)} (@${pr.author}, ${pr.daysOld}d)\n`;
              });
              if (result.stalePRs.older.length > 3) message += `... +${result.stalePRs.older.length - 3} more\n`;
            }
            
            message += `\n💡 **Tip:** Use \`/create-task\` to create improvement tasks for stuck PRs!`;
            
            await interaction.editReply(message);
          }
        } catch (err) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          } else {
            await interaction.editReply(`❌ ${err.message}`);
          }
        }
      }

    } catch (err) {
      console.error("Error handling command:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
        } catch (e) {
          console.error("Failed to send error reply:", e);
        }
      } else if (interaction.deferred) {
        try {
          await interaction.editReply(`❌ Error: ${errorMessage}`);
        } catch (e) {
          console.error("Failed to edit error reply:", e);
        }
      }
    }
  });

  // Register commands
  const rest = new REST({ version: "10" }).setToken(discordToken);
  try {
    console.log(`🔧 Registering commands for guild ${discordGuildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(discordClientId, discordGuildId),
      { body: commands }
    );
    console.log(`✅ Commands registered for guild ${discordGuildId}`);
  } catch (err) {
    console.warn(`⚠️ Failed to register commands (make sure bot is in the server):`, err.message);
    // Continue anyway - commands might already be registered
  }

  client.on("ready", () => {
    console.log(`🤖 Bot logged in as ${client.user.tag} for setup ${id}`);
  });

  await client.login(discordToken);
  return client;
}

// Initialize existing setups on startup
async function initializeSetups() {
  try {
    const setups = await db.getAllSetups();
    console.log(`📦 Found ${setups.length} existing setup(s)`);

    for (const setup of setups) {
      try {
        const fullSetup = await db.getSetupById(setup.id);
        if (fullSetup) {
          const client = await createDiscordBot(fullSetup);
          activeClients.set(setup.id, client);
          console.log(`✅ Initialized: ${setup.githubOwner}/${setup.githubRepo}`);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize setup ${setup.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Failed to initialize setups:", error);
  }
}

// ---------------------
// Express app
// ---------------------

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Root redirect to setup page
app.get("/", (req, res) => {
  res.redirect("/setup");
});

// Setup page
app.get("/setup", (req, res) => {
  res.sendFile("/app/public/setup.html");
});

// OAuth routes
app.use("/oauth", oauthRouter);

// Setup API endpoints
app.use("/api", setupRouter);

// Dynamic webhook endpoint for each setup
app.post("/webhook/:webhookId", async (req, res) => {
  try {
    const { webhookId } = req.params;
    const setup = await db.getSetupByWebhookId(webhookId);

    if (!setup) {
      return res.status(404).json({ error: "Setup not found" });
    }

    const eventName = req.headers["x-github-event"];
    
    // Handle both JSON and form-encoded payloads
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        // If it's form-encoded, it might be in a 'payload' field
        if (payload.includes("payload=")) {
          const decoded = decodeURIComponent(payload.split("payload=")[1]);
          payload = JSON.parse(decoded);
        }
      }
    }

    console.log(`📨 Webhook (${setup.githubOwner}/${setup.githubRepo}): ${eventName}`);

    // Get or create Discord client for this setup
    let client = activeClients.get(setup.id);
    if (!client || !client.isReady()) {
      console.log(`🔄 Creating new Discord client for setup ${setup.id}`);
      client = await createDiscordBot(setup);
      activeClients.set(setup.id, client);
    }

    await workflows.handleGithubEvent(eventName, payload, client, setup);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error handling webhook:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, async () => {
  console.log(`🌐 Express server listening on port ${port}`);
  console.log(`📝 Setup endpoint: POST http://localhost:${port}/api/setup`);
  
  // Initialize database
  try {
    await db.initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  // Initialize existing setups
  await initializeSetups();
});
