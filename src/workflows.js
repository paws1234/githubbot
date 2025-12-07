/**
 * Very small "workflow engine".
 *
 * Given a GitHub event + payload, decides what to do on Discord.
 */

async function handleGithubEvent(eventName, payload, discordClient) {
  try {
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      console.warn("DISCORD_CHANNEL_ID not set; skipping Discord notifications.");
      return;
    }

    const channel = await discordClient.channels.fetch(channelId).catch((err) => {
      throw new Error(`Could not fetch Discord channel ${channelId}: ${err.message}`);
    });
    if (!channel) {
      throw new Error(`Discord channel ${channelId} not found`);
    }

    if (eventName === "pull_request") {
      try {
        const action = payload.action;
        const pr = payload.pull_request;

        if (!pr || !pr.number || !pr.title) {
          throw new Error("Invalid PR payload received from GitHub");
        }

        const msg = `📣 PR #${pr.number} **${pr.title}** (${action}) by **${pr.user?.login || "unknown"}**\n${pr.html_url}`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling pull_request event:", err);
        await channel.send(`⚠️ Error processing PR event: ${err.message}`);
      }
    }

    if (eventName === "push") {
      try {
        const ref = payload.ref;
        const commits = payload.commits || [];
        const repoName = payload.repository && payload.repository.full_name;

        if (!ref || !repoName) {
          throw new Error("Invalid push payload received from GitHub");
        }

        let text = `🚀 Push to \`${ref}\` in **${repoName}** by **${payload.pusher?.name || "unknown"}**`;
        if (commits.length) {
          const lines = commits.slice(0, 5).map(c => `- ${c.message} (${c.id.substring(0, 7)})`);
          text += "\n" + lines.join("\n");
        }
        await channel.send(text);
      } catch (err) {
        console.error("Error handling push event:", err);
        await channel.send(`⚠️ Error processing push event: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Fatal error in handleGithubEvent:", err);
    throw err;
  }
}

module.exports = {
  handleGithubEvent
};
