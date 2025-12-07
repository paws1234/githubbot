const { EmbedBuilder, ChannelType } = require("discord.js");

/**
 * Send a notification to Discord channel
 */
async function sendNotification(client, channelId, embed) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      console.error(`❌ Channel ${channelId} not found or not a text channel`);
      return false;
    }
    await channel.send({ embeds: [embed] });
    return true;
  } catch (err) {
    console.error(`❌ Failed to send notification:`, err.message);
    return false;
  }
}

/**
 * Notify: Branch created
 */
function createBranchNotification(branchName, baseBranch, authorName, repoUrl) {
  return new EmbedBuilder()
    .setColor(0x28a745)
    .setTitle("🌿 New Branch Created")
    .addFields(
      { name: "Branch", value: `\`${branchName}\``, inline: true },
      { name: "From", value: `\`${baseBranch}\``, inline: true },
      { name: "Author", value: authorName, inline: false },
      { name: "Repository", value: `[${repoUrl.split('/').slice(-2).join('/')}](${repoUrl})`, inline: false }
    )
    .setTimestamp();
}

/**
 * Notify: PR created
 */
function createPRNotification(prNumber, prTitle, branchName, authorName, prUrl) {
  return new EmbedBuilder()
    .setColor(0x0366d6)
    .setTitle("📝 New Pull Request")
    .addFields(
      { name: "PR", value: `[#${prNumber}](${prUrl})`, inline: true },
      { name: "Title", value: prTitle, inline: false },
      { name: "Branch", value: `\`${branchName}\``, inline: true },
      { name: "Author", value: authorName, inline: true }
    )
    .setTimestamp();
}

/**
 * Notify: PR merged
 */
function mergePRNotification(prNumber, prTitle, mergeMethod, authorName, prUrl) {
  return new EmbedBuilder()
    .setColor(0x6f42c1)
    .setTitle("✅ Pull Request Merged")
    .addFields(
      { name: "PR", value: `[#${prNumber}](${prUrl})`, inline: true },
      { name: "Title", value: prTitle, inline: false },
      { name: "Method", value: mergeMethod.toUpperCase(), inline: true },
      { name: "Merged by", value: authorName, inline: true }
    )
    .setTimestamp();
}

/**
 * Notify: Issue created
 */
function createIssueNotification(issueNumber, issueTitle, authorName, issueUrl) {
  return new EmbedBuilder()
    .setColor(0xffc107)
    .setTitle("🐛 New Issue Created")
    .addFields(
      { name: "Issue", value: `[#${issueNumber}](${issueUrl})`, inline: true },
      { name: "Title", value: issueTitle, inline: false },
      { name: "Author", value: authorName, inline: true }
    )
    .setTimestamp();
}

/**
 * Notify: Issue closed
 */
function closeIssueNotification(issueNumber, issueTitle, authorName, issueUrl) {
  return new EmbedBuilder()
    .setColor(0x6f42c1)
    .setTitle("✅ Issue Closed")
    .addFields(
      { name: "Issue", value: `[#${issueNumber}](${issueUrl})`, inline: true },
      { name: "Title", value: issueTitle, inline: false },
      { name: "Closed by", value: authorName, inline: true }
    )
    .setTimestamp();
}

/**
 * Notify: PR approved
 */
function approvePRNotification(prNumber, prTitle, reviewerName, prUrl) {
  return new EmbedBuilder()
    .setColor(0x28a745)
    .setTitle("👍 PR Approved")
    .addFields(
      { name: "PR", value: `[#${prNumber}](${prUrl})`, inline: true },
      { name: "Title", value: prTitle, inline: false },
      { name: "Approved by", value: reviewerName, inline: true }
    )
    .setTimestamp();
}

/**
 * Notify: Release created
 */
function createReleaseNotification(tagName, releaseName, authorName, releaseUrl) {
  return new EmbedBuilder()
    .setColor(0x6f42c1)
    .setTitle("🎉 New Release")
    .addFields(
      { name: "Tag", value: `[${tagName}](${releaseUrl})`, inline: true },
      { name: "Release", value: releaseName || tagName, inline: false },
      { name: "Created by", value: authorName, inline: true }
    )
    .setTimestamp();
}

/**
 * Notify: Branch deleted
 */
function deleteBranchNotification(branchName, authorName) {
  return new EmbedBuilder()
    .setColor(0xdc3545)
    .setTitle("🗑️ Branch Deleted")
    .addFields(
      { name: "Branch", value: `\`${branchName}\``, inline: true },
      { name: "Deleted by", value: authorName, inline: true }
    )
    .setTimestamp();
}

module.exports = {
  sendNotification,
  createBranchNotification,
  createPRNotification,
  mergePRNotification,
  createIssueNotification,
  closeIssueNotification,
  approvePRNotification,
  createReleaseNotification,
  deleteBranchNotification
};
