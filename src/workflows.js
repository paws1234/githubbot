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

    if (eventName === "issues") {
      try {
        const action = payload.action;
        const issue = payload.issue;

        if (!issue || !issue.number || !issue.title) {
          throw new Error("Invalid issues payload received from GitHub");
        }

        // Sanitize issue title
        const sanitizedTitle = (issue.title || "Untitled").substring(0, 200);
        const userLogin = issue.user?.login || "unknown";
        const issueUrl = issue.html_url || "#";

        const msg = `📌 Issue #${issue.number} **${sanitizedTitle}** (${action}) by **${userLogin}**\n${issueUrl}`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling issues event:", err);
        await channel.send(`⚠️ Error processing issues event: ${err.message}`);
      }
    }

    if (eventName === "pull_request_review") {
      try {
        const action = payload.action;
        const review = payload.review;
        const pr = payload.pull_request;

        if (!review || !pr || !pr.number) {
          throw new Error("Invalid pull_request_review payload received from GitHub");
        }

        const state = review.state || "commented";
        const reviewerLogin = review.user?.login || "unknown";
        const prTitle = (pr.title || "Untitled").substring(0, 100);
        const prUrl = pr.html_url || "#";

        const stateEmoji = {
          "approved": "✅",
          "changes_requested": "❌",
          "commented": "💬",
          "dismissed": "🚫"
        }[state] || "📝";

        const msg = `${stateEmoji} Review on PR #${pr.number} **${prTitle}** (${state}) by **${reviewerLogin}**\n${prUrl}`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling pull_request_review event:", err);
        await channel.send(`⚠️ Error processing PR review event: ${err.message}`);
      }
    }

    if (eventName === "release") {
      try {
        const action = payload.action;
        const release = payload.release;

        if (!release || !release.tag_name) {
          throw new Error("Invalid release payload received from GitHub");
        }

        const releaseUrl = release.html_url || "#";
        const releaseName = (release.name || release.tag_name).substring(0, 100);
        const authorLogin = release.author?.login || "unknown";
        const prerelease = release.prerelease ? " (prerelease)" : "";

        const msg = `🎉 Release **${releaseName}**${prerelease} (${action}) by **${authorLogin}**\n${releaseUrl}`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling release event:", err);
        await channel.send(`⚠️ Error processing release event: ${err.message}`);
      }
    }

    if (eventName === "discussion") {
      try {
        const action = payload.action;
        const discussion = payload.discussion;

        if (!discussion || !discussion.number || !discussion.title) {
          throw new Error("Invalid discussion payload received from GitHub");
        }

        const sanitizedTitle = (discussion.title || "Untitled").substring(0, 200);
        const userLogin = discussion.user?.login || "unknown";
        const discussionUrl = discussion.html_url || "#";
        const category = discussion.category?.name || "General";

        const msg = `💭 Discussion #${discussion.number} **${sanitizedTitle}** (${action}) in **${category}** by **${userLogin}**\n${discussionUrl}`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling discussion event:", err);
        await channel.send(`⚠️ Error processing discussion event: ${err.message}`);
      }
    }

    if (eventName === "workflow_run") {
      try {
        const action = payload.action;
        const workflowRun = payload.workflow_run;
        const workflow = payload.workflow;

        if (!workflowRun || !workflow) {
          throw new Error("Invalid workflow_run payload received from GitHub");
        }

        const conclusion = workflowRun.conclusion || "pending";
        const emoji = {
          "success": "✅",
          "failure": "❌",
          "neutral": "⚪",
          "cancelled": "🚫",
          "skipped": "⏭️",
          "pending": "⏳"
        }[conclusion] || "🔄";

        const workflowName = (workflow.name || "Workflow").substring(0, 100);
        const branch = workflowRun.head_branch || "unknown";
        const url = workflowRun.html_url || "#";

        const msg = `${emoji} Workflow **${workflowName}** on branch \`${branch}\` ${action} (${conclusion})\n${url}`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling workflow_run event:", err);
        await channel.send(`⚠️ Error processing workflow event: ${err.message}`);
      }
    }

    if (eventName === "create") {
      try {
        const ref = payload.ref;
        const refType = payload.ref_type; // "branch" or "tag"
        const repoName = payload.repository && payload.repository.full_name;
        const pusherName = payload.sender?.login || "unknown";

        if (!ref || !refType || !repoName) {
          throw new Error("Invalid create payload received from GitHub");
        }

        const emoji = refType === "tag" ? "🏷️" : "🌿";
        const msg = `${emoji} New ${refType} \`${ref}\` created in **${repoName}** by **${pusherName}**`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling create event:", err);
        await channel.send(`⚠️ Error processing create event: ${err.message}`);
      }
    }

    if (eventName === "fork") {
      try {
        const forkee = payload.forkee;
        const repoName = payload.repository?.full_name;

        if (!forkee || !repoName) {
          throw new Error("Invalid fork payload received from GitHub");
        }

        const forkOwner = forkee.owner?.login || "unknown";
        const forkUrl = forkee.html_url || "#";

        const msg = `🔀 Repository **${repoName}** forked by **${forkOwner}**\n${forkUrl}`;
        await channel.send(msg);
      } catch (err) {
        console.error("Error handling fork event:", err);
        await channel.send(`⚠️ Error processing fork event: ${err.message}`);
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
