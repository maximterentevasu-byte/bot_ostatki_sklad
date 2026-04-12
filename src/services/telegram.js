const axios = require('axios');

async function downloadTelegramFile(botToken, filePath) {
  const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000
  });

  return Buffer.from(response.data);
}

module.exports = { downloadTelegramFile };
