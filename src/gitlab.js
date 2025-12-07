const axios = require('axios');

function getGitlabClient(token, baseUrl = 'https://gitlab.com') {
  if (!token) {
    throw new Error('GitLab token is not provided');
  }
  return axios.create({
    baseURL: `${baseUrl}/api/v4`,
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json'
    }
  });
}

function getProjectId(owner, project) {
  if (!owner || !project) {
    throw new Error('GITLAB_OWNER and GITLAB_PROJECT must be provided');
  }
  return `${owner}/${project}`;
}

async function createMR(token, owner, project, sourceBranch, title, body = '', baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.post(`/projects/${encodeURIComponent(projectId)}/merge_requests`, {
      source_branch: sourceBranch,
      target_branch: 'main',
      title: title,
      description: body
    });

    return response.data;
  } catch (err) {
    throw new Error(`Failed to create MR: ${err.response?.data?.message || err.message}`);
  }
}

async function approveMR(token, owner, project, mrNumber, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.post(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrNumber}/approve`
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to approve MR: ${err.response?.data?.message || err.message}`);
  }
}

async function commentOnMR(token, owner, project, mrNumber, text, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.post(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrNumber}/notes`,
      { body: text }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to post comment: ${err.response?.data?.message || err.message}`);
  }
}

async function mergeMR(token, owner, project, mrNumber, method = 'merge', baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const mergeMethod = method === 'squash' ? 'squash_and_merge' : 'merge';

    const response = await client.put(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrNumber}/merge`,
      {
        merge_when_pipeline_succeeds: false,
        squash: method === 'squash'
      }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to merge MR: ${err.response?.data?.message || err.message}`);
  }
}

async function createBranch(token, owner, project, branchName, baseBranch = 'main', baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.post(
      `/projects/${encodeURIComponent(projectId)}/repository/branches`,
      {
        branch: branchName,
        ref: baseBranch
      }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to create branch: ${err.response?.data?.message || err.message}`);
  }
}

async function listMRs(token, owner, project, state = 'opened', baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests`,
      {
        params: { state: state, per_page: 50 }
      }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to list MRs: ${err.response?.data?.message || err.message}`);
  }
}

async function listBranches(token, owner, project, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.get(
      `/projects/${encodeURIComponent(projectId)}/repository/branches`,
      { params: { per_page: 50 } }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to list branches: ${err.response?.data?.message || err.message}`);
  }
}

async function createIssue(token, owner, project, title, body = '', baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.post(
      `/projects/${encodeURIComponent(projectId)}/issues`,
      {
        title: title,
        description: body
      }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to create issue: ${err.response?.data?.message || err.message}`);
  }
}

async function listIssues(token, owner, project, state = 'opened', baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.get(
      `/projects/${encodeURIComponent(projectId)}/issues`,
      { params: { state: state, per_page: 50 } }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to list issues: ${err.response?.data?.message || err.message}`);
  }
}

async function closeIssue(token, owner, project, issueNumber, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.put(
      `/projects/${encodeURIComponent(projectId)}/issues/${issueNumber}`,
      { state_event: 'close' }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to close issue: ${err.response?.data?.message || err.message}`);
  }
}

async function reopenIssue(token, owner, project, issueNumber, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.put(
      `/projects/${encodeURIComponent(projectId)}/issues/${issueNumber}`,
      { state_event: 'reopen' }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to reopen issue: ${err.response?.data?.message || err.message}`);
  }
}

async function getIssueInfo(token, owner, project, issueNumber, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.get(
      `/projects/${encodeURIComponent(projectId)}/issues/${issueNumber}`
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to get issue info: ${err.response?.data?.message || err.message}`);
  }
}

async function getMRInfo(token, owner, project, mrNumber, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrNumber}`
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to get MR info: ${err.response?.data?.message || err.message}`);
  }
}

async function getProjectInfo(token, owner, project, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.get(`/projects/${encodeURIComponent(projectId)}`);

    return response.data;
  } catch (err) {
    throw new Error(`Failed to get project info: ${err.response?.data?.message || err.message}`);
  }
}

async function addLabelToIssue(token, owner, project, issueNumber, labels = [], baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.put(
      `/projects/${encodeURIComponent(projectId)}/issues/${issueNumber}`,
      { labels: labels.join(',') }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to add labels: ${err.response?.data?.message || err.message}`);
  }
}

async function deleteBranch(token, owner, project, branchName, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.delete(
      `/projects/${encodeURIComponent(projectId)}/repository/branches/${encodeURIComponent(branchName)}`
    );

    return { success: true };
  } catch (err) {
    throw new Error(`Failed to delete branch: ${err.response?.data?.message || err.message}`);
  }
}

async function getCommits(token, owner, project, limit = 10, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.get(
      `/projects/${encodeURIComponent(projectId)}/repository/commits`,
      { params: { per_page: limit } }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to get commits: ${err.response?.data?.message || err.message}`);
  }
}

async function createRelease(token, owner, project, tagName, name = '', body = '', baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.post(
      `/projects/${encodeURIComponent(projectId)}/releases`,
      {
        tag_name: tagName,
        name: name || tagName,
        description: body
      }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to create release: ${err.response?.data?.message || err.message}`);
  }
}

async function closeMR(token, owner, project, mrNumber, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.put(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrNumber}`,
      { state_event: 'close' }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to close MR: ${err.response?.data?.message || err.message}`);
  }
}

async function assignMR(token, owner, project, mrNumber, assigneeIds = [], baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const response = await client.put(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrNumber}`,
      { assignee_ids: assigneeIds }
    );

    return response.data;
  } catch (err) {
    throw new Error(`Failed to assign MR: ${err.response?.data?.message || err.message}`);
  }
}

async function getProjectStats(token, owner, project, baseUrl = 'https://gitlab.com') {
  try {
    const client = getGitlabClient(token, baseUrl);
    const projectId = getProjectId(owner, project);

    const mrs = await client.get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests`,
      { params: { state: 'all', per_page: 100 } }
    );

    const issues = await client.get(
      `/projects/${encodeURIComponent(projectId)}/issues`,
      { params: { state: 'all', per_page: 100 } }
    );

    const mergedMRs = (mrs.data || []).filter(mr => mr.state === 'merged').length;
    const openMRs = (mrs.data || []).filter(mr => mr.state === 'opened').length;
    const closedIssues = (issues.data || []).filter(i => i.state === 'closed').length;
    const openIssues = (issues.data || []).filter(i => i.state === 'opened').length;

    return {
      mrsOpen: openMRs,
      mrsMerged: mergedMRs,
      issuesOpen: openIssues,
      issuesClosed: closedIssues
    };
  } catch (err) {
    throw new Error(`Failed to get project stats: ${err.response?.data?.message || err.message}`);
  }
}

function getCloneCommand(owner, project, baseUrl = 'https://gitlab.com') {
  return `git clone ${baseUrl}/${owner}/${project}.git`;
}

function getCheckoutCommand(branchName) {
  return `git checkout ${branchName}`;
}

function getPullCommand() {
  return `git pull origin main`;
}

function getPushCommand(branchName) {
  return `git push origin ${branchName}`;
}

module.exports = {
  createMR,
  approveMR,
  commentOnMR,
  mergeMR,
  createBranch,
  listMRs,
  listBranches,
  createIssue,
  listIssues,
  closeIssue,
  reopenIssue,
  getIssueInfo,
  getMRInfo,
  getProjectInfo,
  addLabelToIssue,
  deleteBranch,
  getCommits,
  createRelease,
  closeMR,
  assignMR,
  getProjectStats,
  getCloneCommand,
  getCheckoutCommand,
  getPullCommand,
  getPushCommand
};
