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

async function listPRs(token, owner, repo, state = "open") {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.pulls.list({
      ...repoConfig,
      state,
      per_page: 10,
      sort: "updated",
      direction: "desc"
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to list PRs: ${err.message}`);
  }
}

async function listBranches(token, owner, repo) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.repos.listBranches({
      ...repoConfig,
      per_page: 20
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to list branches: ${err.message}`);
  }
}

async function createIssue(token, owner, repo, title, body = "", labels = []) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.create({
      ...repoConfig,
      title,
      body,
      labels
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to create issue: ${err.message}`);
  }
}

async function getPRInfo(token, owner, repo, number) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.pulls.get({
      ...repoConfig,
      pull_number: number
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`PR #${number} not found`);
    }
    throw new Error(`Failed to get PR info: ${err.message}`);
  }
}

async function getRepoInfo(token, owner, repo) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.repos.get(repoConfig);
    return res.data;
  } catch (err) {
    throw new Error(`Failed to get repo info: ${err.message}`);
  }
}

async function closeIssue(token, owner, repo, number) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.update({
      ...repoConfig,
      issue_number: number,
      state: "closed"
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Issue #${number} not found`);
    }
    throw new Error(`Failed to close issue: ${err.message}`);
  }
}

async function reopenIssue(token, owner, repo, number) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.update({
      ...repoConfig,
      issue_number: number,
      state: "open"
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Issue #${number} not found`);
    }
    throw new Error(`Failed to reopen issue: ${err.message}`);
  }
}

async function closePR(token, owner, repo, number) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.pulls.update({
      ...repoConfig,
      pull_number: number,
      state: "closed"
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`PR #${number} not found`);
    }
    throw new Error(`Failed to close PR: ${err.message}`);
  }
}

async function assignPR(token, owner, repo, number, reviewers = []) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.pulls.requestReviewers({
      ...repoConfig,
      pull_number: number,
      reviewers
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to assign reviewers: ${err.message}`);
  }
}

async function listIssues(token, owner, repo, state = "open") {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.list({
      ...repoConfig,
      state,
      per_page: 10,
      sort: "updated",
      direction: "desc"
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to list issues: ${err.message}`);
  }
}

async function addLabel(token, owner, repo, number, labels = []) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.addLabels({
      ...repoConfig,
      issue_number: number,
      labels
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to add labels: ${err.message}`);
  }
}

async function getCommits(token, owner, repo, limit = 10) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.repos.listCommits({
      ...repoConfig,
      per_page: limit
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to get commits: ${err.message}`);
  }
}

async function createRelease(token, owner, repo, tagName, body = "", isDraft = false) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.repos.createRelease({
      ...repoConfig,
      tag_name: tagName,
      body,
      draft: isDraft
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to create release: ${err.message}`);
  }
}

async function getIssueInfo(token, owner, repo, number) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.get({
      ...repoConfig,
      issue_number: number
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Issue #${number} not found`);
    }
    throw new Error(`Failed to get issue info: ${err.message}`);
  }
}

async function deleteBranch(token, owner, repo, branchName) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.git.deleteRef({
      ...repoConfig,
      ref: `heads/${branchName}`
    });
    return res.data;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Branch "${branchName}" not found`);
    }
    throw new Error(`Failed to delete branch: ${err.message}`);
  }
}

// Helper: Generate git commands for developers
function getCloneCommand(owner, repo) {
  return `git clone https://github.com/${owner}/${repo}.git`;
}

function getCheckoutCommand(branchName) {
  return `git checkout ${branchName}`;
}

function getPullCommand() {
  return `git pull origin main`;
}

function getCommitCommand(message) {
  return `git commit -m "${message}"`;
}

function getPushCommand(branchName) {
  return `git push origin ${branchName}`;
}


module.exports = {
  createPR,
  approvePR,
  commentPR,
  mergePR,
  createBranch,
  listPRs,
  listBranches,
  createIssue,
  getPRInfo,
  getRepoInfo,
  closeIssue,
  reopenIssue,
  closePR,
  assignPR,
  listIssues,
  addLabel,
  getCommits,
  createRelease,
  getIssueInfo,
  deleteBranch,
  getCloneCommand,
  getCheckoutCommand,
  getPullCommand,
  getCommitCommand,
  getPushCommand
};
