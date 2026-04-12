const axios = require('axios');
const { uploadFileToGitHub } = require('../services/github');

function isExcelFile(document) {
  if (!document || !document.file_name) {
    return false;
  }

  const lower = document.file_name.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}

async function downloadTelegramFile(fileUrl) {
  const response = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  });

  return Buffer.from(response.data);
}

async function handleDocument(ctx) {
  const document = ctx.message?.document;

  if (!document) {
    return;
  }

  if (!isExcelFile(document)) {
    await ctx.reply('Пожалуйста, отправь Excel файл в формате .xlsx или .xls.');
    return;
  }

  try {
    await ctx.reply('Файл получен. Загружаю его в GitHub...');

    const fileLink = await ctx.telegram.getFileLink(document.file_id);
    const fileBuffer = await downloadTelegramFile(fileLink.href);

    const result = await uploadFileToGitHub({
      fileName: document.file_name,
      fileBuffer
    });

    await ctx.reply(
      `Готово. Файл загружен в GitHub.\n\nПуть: ${result.path}\nСсылка: ${result.htmlUrl}`
    );
  } catch (error) {
    console.error('Upload error:', error);
    await ctx.reply(`Не удалось загрузить файл в GitHub. Ошибка: ${error.message}`);
  }
}

module.exports = {
  handleDocument
};
