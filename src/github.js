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

// New functions for additional features

async function renameBranch(token, owner, repo, oldName, newName) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Get the old branch reference
    const oldRef = await octokit.git.getRef({
      ...repoConfig,
      ref: `heads/${oldName}`
    });

    // Create new branch
    await octokit.git.createRef({
      ...repoConfig,
      ref: `refs/heads/${newName}`,
      sha: oldRef.data.object.sha
    });

    // Delete old branch
    await octokit.git.deleteRef({
      ...repoConfig,
      ref: `heads/${oldName}`
    });

    return { oldName, newName, success: true };
  } catch (err) {
    throw new Error(`Failed to rename branch: ${err.message}`);
  }
}

async function compareBranches(token, owner, repo, base, head) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.repos.compareCommits({
      ...repoConfig,
      base,
      head
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to compare branches: ${err.message}`);
  }
}

async function syncBranch(token, owner, repo, branchName, baseBranch = "main") {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Get base branch ref
    const baseRef = await octokit.git.getRef({
      ...repoConfig,
      ref: `heads/${baseBranch}`
    });

    // Update branch to point to same SHA as base
    const res = await octokit.git.updateRef({
      ...repoConfig,
      ref: `heads/${branchName}`,
      sha: baseRef.data.object.sha,
      force: true
    });

    return res.data;
  } catch (err) {
    throw new Error(`Failed to sync branch: ${err.message}`);
  }
}

async function assignIssue(token, owner, repo, number, assignees = []) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.issues.addAssignees({
      ...repoConfig,
      issue_number: number,
      assignees
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to assign issue: ${err.message}`);
  }
}

async function linkIssueToPR(token, owner, repo, prNumber, issueNumber) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Add issue reference to PR body
    const pr = await octokit.pulls.get({
      ...repoConfig,
      pull_number: prNumber
    });

    const issueLink = `\n\nCloses #${issueNumber}`;
    const newBody = (pr.data.body || "") + issueLink;

    const res = await octokit.pulls.update({
      ...repoConfig,
      pull_number: prNumber,
      body: newBody
    });

    return res.data;
  } catch (err) {
    throw new Error(`Failed to link issue to PR: ${err.message}`);
  }
}

async function requestChanges(token, owner, repo, prNumber, message = "") {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.pulls.createReview({
      ...repoConfig,
      pull_number: prNumber,
      event: "REQUEST_CHANGES",
      body: message || "Changes requested"
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to request changes: ${err.message}`);
  }
}

async function getPRDiff(token, owner, repo, prNumber) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const files = await octokit.pulls.listFiles({
      ...repoConfig,
      pull_number: prNumber,
      per_page: 50
    });

    return files.data;
  } catch (err) {
    throw new Error(`Failed to get PR diff: ${err.message}`);
  }
}

async function autoMergePR(token, owner, repo, prNumber, mergeMethod = "merge") {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Check if PR can be auto-merged
    const pr = await octokit.pulls.get({
      ...repoConfig,
      pull_number: prNumber
    });

    if (!pr.data.mergeable) {
      throw new Error("PR has merge conflicts");
    }

    // Enable auto-merge
    const res = await octokit.rest.pulls.enableAutoMerge({
      ...repoConfig,
      pull_number: prNumber,
      merge_method: mergeMethod
    });

    return res.data;
  } catch (err) {
    throw new Error(`Failed to enable auto-merge: ${err.message}`);
  }
}

async function checkMergeConflicts(token, owner, repo, prNumber) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const pr = await octokit.pulls.get({
      ...repoConfig,
      pull_number: prNumber
    });

    return {
      mergeable: pr.data.mergeable,
      mergeableState: pr.data.mergeable_state,
      conflictingFiles: !pr.data.mergeable ? "Check GitHub for details" : null
    };
  } catch (err) {
    throw new Error(`Failed to check conflicts: ${err.message}`);
  }
}

async function getCodeReviewStatus(token, owner, repo) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const prs = await octokit.pulls.list({
      ...repoConfig,
      state: "open",
      per_page: 50,
      sort: "updated",
      direction: "desc"
    });

    // Filter PRs awaiting review
    const awaitingReview = prs.data.filter(pr => {
      const reviews = pr.requested_reviewers?.length > 0;
      return reviews;
    });

    return awaitingReview;
  } catch (err) {
    throw new Error(`Failed to get review status: ${err.message}`);
  }
}

async function getTeamStats(token, owner, repo) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Get stats from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const prs = await octokit.pulls.list({
      ...repoConfig,
      state: "closed",
      per_page: 100,
      sort: "updated",
      direction: "desc"
    });

    const issues = await octokit.issues.list({
      ...repoConfig,
      state: "closed",
      per_page: 100,
      sort: "updated",
      direction: "desc"
    });

    const commits = await octokit.repos.listCommits({
      ...repoConfig,
      since: sevenDaysAgo.toISOString(),
      per_page: 100
    });

    return {
      prsMerged: prs.data.length,
      issuesClosed: issues.data.length,
      commitsThisWeek: commits.data.length,
      period: "Last 7 days"
    };
  } catch (err) {
    throw new Error(`Failed to get team stats: ${err.message}`);
  }
}

async function protectBranch(token, owner, repo, branchName, options = {}) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const res = await octokit.repos.updateBranchProtection({
      ...repoConfig,
      branch: branchName,
      required_status_checks: {
        strict: true,
        contexts: options.contexts || []
      },
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: options.requireCodeOwnerReview || false,
        required_approving_review_count: options.requiredApprovals || 1
      },
      enforce_admins: true,
      restrictions: null
    });

    return res.data;
  } catch (err) {
    throw new Error(`Failed to protect branch: ${err.message}`);
  }
}

async function getDeploymentStatus(token, owner, repo) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const deployments = await octokit.repos.listDeployments({
      ...repoConfig,
      per_page: 10
    });

    if (!deployments.data.length) {
      return { status: "No deployments found" };
    }

    // Get latest deployment status
    const latest = deployments.data[0];
    const statuses = await octokit.repos.listDeploymentStatuses({
      ...repoConfig,
      deployment_id: latest.id
    });

    return {
      latestDeployment: {
        id: latest.id,
        environment: latest.environment,
        ref: latest.ref,
        creator: latest.creator.login,
        createdAt: latest.created_at
      },
      status: statuses.data[0]?.state || "unknown",
      description: statuses.data[0]?.description || ""
    };
  } catch (err) {
    throw new Error(`Failed to get deployment status: ${err.message}`);
  }
}

async function createRollback(token, owner, repo, targetTag) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Get target release
    const targetRelease = await octokit.repos.getReleaseByTag({
      ...repoConfig,
      tag: targetTag
    });

    // Create a new release pointing to same tag (rollback marker)
    const res = await octokit.repos.createRelease({
      ...repoConfig,
      tag_name: `rollback-${Date.now()}`,
      target_commitish: targetRelease.data.target_commitish,
      name: `Rollback to ${targetTag}`,
      body: `Rolled back to release ${targetTag}\n\nOriginal: ${targetRelease.data.html_url}`,
      draft: false,
      prerelease: false
    });

    return res.data;
  } catch (err) {
    throw new Error(`Failed to create rollback: ${err.message}`);
  }
}

async function getGitHubStatus(token) {
  try {
    const octokit = getOctokit(token);
    
    // Use GitHub's status API (if available) or check basic connectivity
    const status = await octokit.meta.getStatus();
    
    return {
      status: "operational",
      statusPage: "https://www.githubstatus.com"
    };
  } catch (err) {
    return {
      status: "unknown",
      error: err.message
    };
  }
}

async function unprotectBranch(token, owner, repo, branchName) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    await octokit.repos.deleteBranchProtection({
      ...repoConfig,
      branch: branchName
    });

    return { success: true };
  } catch (err) {
    throw new Error(`Failed to unprotect branch: ${err.message}`);
  }
}

async function scanPRForSecrets(token, owner, repo, prNumber) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Get PR files
    const files = await octokit.pulls.listFiles({
      ...repoConfig,
      pull_number: prNumber,
      per_page: 100
    });

    // Secret patterns to detect
    const secretPatterns = {
      'AWS_KEY': /AKIA[0-9A-Z]{16}/g,
      'PRIVATE_KEY': /-----BEGIN (RSA|DSA|EC|PGP|OPENSSH) PRIVATE KEY/g,
      'API_KEY': /(api[_-]?key|apikey)["\s:=]+([a-zA-Z0-9\-_]{20,})/gi,
      'TOKEN': /(token|auth)["\s:=]+([a-zA-Z0-9\-_.]{20,})/gi,
      'PASSWORD': /(password|passwd|pwd)["\s:=]+([^\s"]{8,})/gi,
      'DATABASE_URL': /(database_url|db_url)["\s:=]+([^\s"]+)/gi,
      'GITHUB_TOKEN': /gh[pourt]_[a-zA-Z0-9]{36,255}/g,
      'SLACK_TOKEN': /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
      'ENV_FILE': /\.env(\.(local|development|production|staging))?$/
    };

    const secrets = [];
    const envFiles = [];

    for (const file of files) {
      // Check for .env files
      if (secretPatterns.ENV_FILE.test(file.filename)) {
        envFiles.push(file.filename);
      }

      // Get file content
      if (file.patch) {
        for (const [secretType, pattern] of Object.entries(secretPatterns)) {
          if (secretType === 'ENV_FILE') continue;
          
          const matches = file.patch.match(pattern);
          if (matches) {
            secrets.push({
              type: secretType,
              file: file.filename,
              count: matches.length
            });
          }
        }
      }
    }

    return {
      prNumber,
      secretsFound: secrets.length > 0,
      secrets: secrets,
      envFiles: envFiles,
      totalFiles: files.length,
      status: secrets.length === 0 && envFiles.length === 0 ? '✅ SAFE' : '⚠️ POTENTIAL SECRETS FOUND'
    };
  } catch (err) {
    throw new Error(`Failed to scan PR for secrets: ${err.message}`);
  }
}

async function checkDependencyVulnerabilities(token, owner, repo) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    // Get repository content to check for lock files and manifests
    const files = await octokit.repos.getContent({
      ...repoConfig,
      path: '/'
    }).catch(() => ({ data: [] }));

    const vulnerabilityInfo = {
      npm: { hasLockFile: false, status: 'Not configured' },
      python: { hasLockFile: false, status: 'Not configured' },
      composer: { hasLockFile: false, status: 'Not configured' },
      ruby: { hasLockFile: false, status: 'Not configured' }
    };

    // Check for various package files
    const fileNames = Array.isArray(files.data) ? files.data.map(f => f.name) : [];

    if (fileNames.includes('package.json') || fileNames.includes('package-lock.json') || fileNames.includes('yarn.lock')) {
      vulnerabilityInfo.npm = { hasLockFile: true, status: 'npm audit recommended' };
    }

    if (fileNames.includes('requirements.txt') || fileNames.includes('Pipfile') || fileNames.includes('poetry.lock')) {
      vulnerabilityInfo.python = { hasLockFile: true, status: 'pip audit recommended' };
    }

    if (fileNames.includes('composer.json') || fileNames.includes('composer.lock')) {
      vulnerabilityInfo.composer = { hasLockFile: true, status: 'composer audit recommended' };
    }

    if (fileNames.includes('Gemfile') || fileNames.includes('Gemfile.lock')) {
      vulnerabilityInfo.ruby = { hasLockFile: true, status: 'bundle audit recommended' };
    }

    return {
      repo: `${owner}/${repo}`,
      timestamp: new Date().toISOString(),
      dependencies: vulnerabilityInfo,
      recommendation: 'Run vulnerability audits on your CI/CD pipeline to detect vulnerable packages automatically.'
    };
  } catch (err) {
    throw new Error(`Failed to check dependencies: ${err.message}`);
  }
}

async function getAuditLogs(token, owner, repo, userId = null, daysBack = 7) {
  try {
    const octokit = getOctokit(token);
    const repoConfig = getRepoConfig(owner, repo);

    const since = new Date();
    since.setDate(since.getDate() - Math.min(daysBack, 365)); // Max 365 days

    // Get commits
    const commits = await octokit.repos.listCommits({
      ...repoConfig,
      since: since.toISOString(),
      per_page: 100
    }).catch(() => ({ data: [] }));

    // Get pull requests
    const prs = await octokit.pulls.list({
      ...repoConfig,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100
    }).catch(() => ({ data: [] }));

    // Get issues
    const issues = await octokit.issues.list({
      ...repoConfig,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100
    }).catch(() => ({ data: [] }));

    // Filter by user if provided
    let filteredLogs = [];

    const commitLogs = (commits.data || []).map(c => ({
      type: 'commit',
      action: 'COMMIT',
      author: c.commit.author.name,
      timestamp: c.commit.author.date,
      details: c.commit.message.substring(0, 100),
      sha: c.sha.substring(0, 7)
    }));

    const prLogs = (prs.data || []).map(pr => ({
      type: 'pull_request',
      action: pr.state.toUpperCase(),
      author: pr.user.login,
      timestamp: pr.updated_at,
      details: `#${pr.number} - ${pr.title.substring(0, 60)}`,
      url: pr.html_url
    }));

    const issueLogs = (issues.data || []).map(issue => ({
      type: 'issue',
      action: issue.state.toUpperCase(),
      author: issue.user.login,
      timestamp: issue.updated_at,
      details: `#${issue.number} - ${issue.title.substring(0, 60)}`,
      url: issue.html_url
    }));

    filteredLogs = [...commitLogs, ...prLogs, ...issueLogs];

    // Filter by user if provided
    if (userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.author.toLowerCase().includes(userId.toLowerCase())
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      repo: `${owner}/${repo}`,
      period: `Last ${daysBack} days`,
      totalEvents: filteredLogs.length,
      logs: filteredLogs.slice(0, 50), // Return first 50
      userFilter: userId || 'All users'
    };
  } catch (err) {
    throw new Error(`Failed to get audit logs: ${err.message}`);
  }
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
  getPushCommand,
  renameBranch,
  compareBranches,
  syncBranch,
  assignIssue,
  linkIssueToPR,
  requestChanges,
  getPRDiff,
  autoMergePR,
  checkMergeConflicts,
  getCodeReviewStatus,
  getTeamStats,
  protectBranch,
  getDeploymentStatus,
  createRollback,
  getGitHubStatus,
  unprotectBranch,
  scanPRForSecrets,
  checkDependencyVulnerabilities,
  getAuditLogs
};
