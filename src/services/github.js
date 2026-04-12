const axios = require('axios');
const config = require('../config');

function toBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

async function getFileSha(path) {
  const url = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      params: {
        ref: config.githubBranch
      }
    });

    return response.data.sha;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }

    throw new Error(`GitHub SHA request failed: ${error.response?.data?.message || error.message}`);
  }
}

async function uploadFileToGitHub({ fileName, fileBuffer }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeFileName = fileName.replace(/\s+/g, '_');
  const path = `${config.githubUploadDir}/${timestamp}_${safeFileName}`;
  const sha = await getFileSha(path);

  const url = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;

  try {
    const response = await axios.put(
      url,
      {
        message: `Upload Excel file: ${safeFileName}`,
        content: toBase64(fileBuffer),
        branch: config.githubBranch,
        ...(sha ? { sha } : {})
      },
      {
        headers: {
          Authorization: `Bearer ${config.githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    return {
      path,
      htmlUrl: response.data.content?.html_url || `https://github.com/${config.githubOwner}/${config.githubRepo}/blob/${config.githubBranch}/${path}`
    };
  } catch (error) {
    throw new Error(`GitHub upload failed: ${error.response?.data?.message || error.message}`);
  }
}

module.exports = {
  uploadFileToGitHub
};
