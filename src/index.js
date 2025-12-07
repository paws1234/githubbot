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

        await interaction.deferReply();
        try {
          const result = await github.createBranch(githubToken, githubOwner, githubRepo, name, base);
          await interaction.editReply(`🌿 Branch **${name}** created from **${base}** successfully!`);
        } catch (err) {
          console.error(err);
          await interaction.editReply(`❌ Failed to create branch: ${err.message}`);
        }
      }

    } catch (err) {
      console.error("Error handling command:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      if (!interaction.replied) {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      } else {
        await interaction.editReply(`❌ Error: ${errorMessage}`);
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
    console.error(`Failed to register commands:`, err);
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

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

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
    const payload = req.body;

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
  
  // Initialize existing setups
  await initializeSetups();
});
