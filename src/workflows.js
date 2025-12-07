/**
 * Very small "workflow engine".
 *
 * Given a GitHub event + payload, decides what to do on Discord.
 */

async function handleGithubEvent(eventName, payload, discordClient, setup) {
  try {
    const channelId = setup?.discordChannelId || process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      console.warn("DISCORD_CHANNEL_ID not set; skipping Discord notifications.");
      return;
    }

    const channel = await discordClient.channels.fetch(channelId).catch((err) => {
      // Provide specific error messages based on error type
      if (err.code === 'ChannelNotFound' || err.status === 404) {
        throw new Error(`Discord channel ${channelId} was deleted or is invalid`);
      } else if (err.status === 403) {
        throw new Error(`Bot doesn't have permission to access channel ${channelId}`);
      } else if (err.code === 'UnknownChannel') {
        throw new Error(`Channel ${channelId} not found - it may have been deleted`);
      }
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

        // Sanitize PR title to prevent Discord markdown abuse
        const sanitizedTitle = (pr.title || "Untitled").substring(0, 200);
        const userLogin = pr.user?.login || "unknown";
        const prUrl = pr.html_url || "#";

        const msg = `📣 PR #${pr.number} **${sanitizedTitle}** (${action}) by **${userLogin}**\n${prUrl}`;
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
        const deleted = payload.deleted === true;

        if (!ref || !repoName) {
          throw new Error("Invalid push payload received from GitHub");
        }

        // Handle branch deletion
        if (deleted) {
          const branchName = ref.replace('refs/heads/', '');
          const text = `🗑️ Branch \`${branchName}\` deleted in **${repoName}** by **${payload.pusher?.name || "unknown"}**`;
          await channel.send(text);
          return;
        }

        // Handle regular push
        let text = `🚀 Push to \`${ref}\` in **${repoName}** by **${payload.pusher?.name || "unknown"}**`;
        if (commits.length) {
          const lines = commits
            .slice(0, 5)
            .map(c => {
              const message = (c?.message || "No message").substring(0, 100);
              const commitId = c?.id?.substring(0, 7) || "unknown";
              return `- ${message} (${commitId})`;
            })
            .filter(line => line && line.length < 100);
          text += "\n" + lines.join("\n");
        }
        
        // Ensure message doesn't exceed Discord limit
        if (text.length > 2000) {
          text = text.substring(0, 1997) + "...";
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
