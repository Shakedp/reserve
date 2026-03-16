/**
 * GitHub API client for user JSON files in the repo.
 * Uses the repo as the "database" – no separate server needed.
 * Set VITE_GITHUB_REPO=owner/repo to override (e.g. Shakedp/reserve).
 */
const REPO = import.meta.env.VITE_GITHUB_REPO || 'Shakedp/reserve';
const USERS_PATH = 'public/assets/users';

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function listUsers(token) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${USERS_PATH}`,
    { headers: headers(token) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((f) => f.name.endsWith('.json'))
    .map((f) => f.name.replace(/\.json$/, ''));
}

export async function getUser(token, userName) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${USERS_PATH}/${userName}.json`,
    { headers: headers(token) }
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API ${res.status}`);
  }
  const data = await res.json();
  const content = atob(data.content.replace(/\n/g, ''));
  return { ...JSON.parse(content), _sha: data.sha };
}

export async function createUser(token, userName, userData) {
  const content = JSON.stringify(userData, null, 2);
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${USERS_PATH}/${userName}.json`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({
        message: `Add user: ${userName}`,
        content: btoa(unescape(encodeURIComponent(content))),
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API ${res.status}`);
  }
  return res.json();
}

export async function updateUser(token, userName, userData, sha) {
  const content = JSON.stringify(userData, null, 2);
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${USERS_PATH}/${userName}.json`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({
        message: `Update user: ${userName}`,
        content: btoa(unescape(encodeURIComponent(content))),
        sha,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API ${res.status}`);
  }
  return res.json();
}

export async function deleteUser(token, userName, sha) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${USERS_PATH}/${userName}.json`,
    {
      method: 'DELETE',
      headers: headers(token),
      body: JSON.stringify({
        message: `Remove user: ${userName}`,
        sha,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API ${res.status}`);
  }
}

export async function triggerDeploy(token) {
  const [owner, repo] = REPO.split('/');
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy.yml/dispatches`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ ref: 'main' }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Workflow dispatch ${res.status}`);
  }
}
