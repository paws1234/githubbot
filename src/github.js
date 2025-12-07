const { Octokit } = require("@octokit/rest");

function getOctokit(token) {
  if (!token) {
    throw new Error("GitHub token is not provided");
  }
  return new Octokit({
    auth: token,
    userAgent: "github-discord-automation"
  });
}

function getRepoConfig(owner, repo) {
  if (!owner || !repo) {
    throw new Error("GITHUB_OWNER and GITHUB_REPO must be provided");
  }
  return { owner, repo };
}

async function createPR(token, owner, repo, branch, title, body = "") {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.pulls.create({
      ...repoConfig,
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

async function approvePR(token, owner, repo, number) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.pulls.createReview({
      ...repoConfig,
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

async function commentPR(token, owner, repo, number, text) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.createComment({
      ...repoConfig,
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

async function mergePR(token, owner, repo, number, method = "merge") {
  const octokit = getOctokit(token);
  const repoConfig = getRepoConfig(owner, repo);

  const res = await octokit.pulls.merge({
    ...repoConfig,
    pull_number: number,
    merge_method: method
  });
  return res.data;
}

async function createBranch(token, owner, repo, branchName, baseBranch = "main") {
  const octokit = getOctokit(token);
  const repoConfig = getRepoConfig(owner, repo);

  const baseRef = await octokit.git.getRef({
    ...repoConfig,
    ref: `heads/${baseBranch}`
  });

  const sha = baseRef.data.object.sha;

  const newRef = await octokit.git.createRef({
    ...repoConfig,
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
