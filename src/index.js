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
    .setDescription("Get repository information")

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
        } catch (err) {
          await interaction.editReply(`❌ Failed to create PR: ${err.message}`);
        }
      }

      if (interaction.commandName === "approve-pr") {
        const number = interaction.options.getInteger("number", true);
        await interaction.deferReply({ ephemeral: false });
        try {
          await github.approvePR(githubToken, githubOwner, githubRepo, number);
          await interaction.editReply(`👍 Approved PR #${number}`);
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
          const res = await github.mergePR(githubToken, githubOwner, githubRepo, number, method);
          if (res.merged) {
            await interaction.editReply(`✅ PR #${number} merged via \`${method}\``);
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
