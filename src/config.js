const required = [
  'BOT_TOKEN',
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_BRANCH',
  'GITHUB_UPLOAD_DIR'
];

function getConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return {
    botToken: process.env.BOT_TOKEN,
    githubToken: process.env.GITHUB_TOKEN,
    githubOwner: process.env.GITHUB_OWNER,
    githubRepo: process.env.GITHUB_REPO,
    githubBranch: process.env.GITHUB_BRANCH,
    githubUploadDir: process.env.GITHUB_UPLOAD_DIR.replace(/^\/+|\/+$/g, ''),
    maxBarcodePhotoAttempts: 3
  };
}

module.exports = { getConfig };
