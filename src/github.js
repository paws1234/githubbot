const { Octokit } = require("@octokit/rest");

function getOctokit() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not set");
  }
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: "github-discord-automation"
  });
}

function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) {
    throw new Error("GITHUB_OWNER and GITHUB_REPO must be set");
  }
  return { owner, repo };
}

async function createPR(branch, title, body = "") {
  try {
    const octokit = getOctokit();
    const repo = getRepoConfig();

    const res = await octokit.pulls.create({
      ...repo,
      title,
      head: branch,
      base: "main",
      body
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Branch "${branch}" not found. Please check if the branch exists on GitHub.`);
    } else if (err.status === 422) {
      throw new Error(`PR already exists or branch cannot be merged. Please check the PR status.`);
    } else if (err.status === 401) {
      throw new Error(`Authentication failed. Please verify your GitHub token.`);
    }
    throw new Error(`Failed to create PR: ${err.message}`);
  }
}

async function approvePR(number) {
  try {
    const octokit = getOctokit();
    const repo = getRepoConfig();

    const res = await octokit.pulls.createReview({
      ...repo,
      pull_number: number,
      event: "APPROVE"
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`PR #${number} not found. Please check the PR number.`);
    } else if (err.status === 422) {
      throw new Error(`Cannot approve PR #${number}. The PR may be already merged or closed.`);
    }
    throw new Error(`Failed to approve PR: ${err.message}`);
  }
}

async function commentPR(number, text) {
  try {
    const octokit = getOctokit();
    const repo = getRepoConfig();

    const res = await octokit.issues.createComment({
      ...repo,
      issue_number: number,
      body: text
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`PR #${number} not found. Please check the PR number.`);
    }
    throw new Error(`Failed to post comment: ${err.message}`);
  }
}

async function mergePR(number, method = "merge") {
  const octokit = getOctokit();
  const repo = getRepoConfig();

  const res = await octokit.pulls.merge({
    ...repo,
    pull_number: number,
    merge_method: method
  });
  return res.data;
}
async function createBranch(branchName, baseBranch = "main") {
  const octokit = getOctokit();
  const repo = getRepoConfig();

  const baseRef = await octokit.git.getRef({
    ...repo,
    ref: `heads/${baseBranch}`
  });

  const sha = baseRef.data.object.sha;

  const newRef = await octokit.git.createRef({
    ...repo,
    ref: `refs/heads/${branchName}`,
    sha
  });

  return newRef.data;
}



module.exports = {
  createPR,
  approvePR,
  commentPR,
  mergePR,
  createBranch

};
