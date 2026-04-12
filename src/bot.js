const path = require('path');
const { Telegraf, session } = require('telegraf');
const { mainKeyboard } = require('./keyboards');
const { GitHubService } = require('./services/github');
const { downloadTelegramFile } = require('./services/telegram');
const { decodeEan13FromBuffer } = require('./services/barcode');
const { findProductByBarcode } = require('./services/excel');
const { formatProductMessage } = require('./messages');

function ensureSession(ctx) {
  if (!ctx.session || typeof ctx.session !== 'object') {
    ctx.session = {};
  }

  if (!ctx.session.flow) {
    ctx.session.flow = 'idle';
  }

  if (typeof ctx.session.photoAttempts !== 'number') {
    ctx.session.photoAttempts = 0;
  }
}

function resetBarcodeFlow(ctx) {
  ctx.session.flow = 'idle';
  ctx.session.photoAttempts = 0;
}

function createBot(config) {
  const bot = new Telegraf(config.botToken);
  const githubService = new GitHubService(config);

  bot.use(session({
    defaultSession: () => ({
      flow: 'idle',
      photoAttempts: 0
    })
  }));
  bot.use((ctx, next) => {
    ensureSession(ctx);
    return next();
  });

  bot.start(async (ctx) => {
    resetBarcodeFlow(ctx);
    await ctx.reply(
      'Нажми «Загрузить файл», чтобы загрузить базу.\nНажми «Проверить ШК», чтобы проверить остатки в базе.',
      mainKeyboard()
    );
  });

  bot.hears('Загрузить файл', async (ctx) => {
    resetBarcodeFlow(ctx);
    ctx.session.flow = 'awaiting_excel';
    await ctx.reply('Отправьте Excel-файл в этот чат. Старый файл в папке GitHub будет удален, новый — загружен вместо него.', mainKeyboard());
  });

  bot.hears('Проверить ШК', async (ctx) => {
    ctx.session.flow = 'awaiting_barcode_photo';
    ctx.session.photoAttempts = 0;
    await ctx.reply('Сфотографируйте штрихкод товара и отправьте фото. Доступно не более 3 попыток. Код должен состоять из 13 цифр и читаться полностью.', mainKeyboard());
  });

  bot.on('document', async (ctx) => {
    if (ctx.session.flow !== 'awaiting_excel') {
      await ctx.reply('Чтобы обновить базу, сначала нажмите кнопку «Загрузить файл».', mainKeyboard());
      return;
    }

    const document = ctx.message.document;
    const fileName = document.file_name || 'base.xlsx';

    if (!/\.(xlsx|xls|xlsm|xlsb)$/i.test(fileName)) {
      await ctx.reply('Пожалуйста, отправьте именно Excel-файл: .xlsx, .xls, .xlsm или .xlsb.', mainKeyboard());
      return;
    }

    try {
      const telegramFile = await ctx.telegram.getFile(document.file_id);
      const fileBuffer = await downloadTelegramFile(config.botToken, telegramFile.file_path);
      const safeName = `${Date.now()}_${path.basename(fileName).replace(/\s+/g, '_')}`;

      await githubService.uploadSingleFile(safeName, fileBuffer);
      ctx.session.flow = 'idle';

      await ctx.reply(`Файл успешно обновлен в GitHub.\nТекущий файл в папке: ${safeName}`, mainKeyboard());
    } catch (error) {
      await ctx.reply(`Не удалось загрузить файл в GitHub.\n${error.message}`, mainKeyboard());
    }
  });

  bot.on('photo', async (ctx) => {
    if (ctx.session.flow !== 'awaiting_barcode_photo') {
      await ctx.reply('Нажмите «Проверить ШК», чтобы начать проверку по фото штрихкода.', mainKeyboard());
      return;
    }

    const currentAttempt = ctx.session.photoAttempts + 1;
    ctx.session.photoAttempts = currentAttempt;

    try {
      const photos = ctx.message.photo || [];
      const largestPhoto = photos[photos.length - 1];
      const telegramFile = await ctx.telegram.getFile(largestPhoto.file_id);
      const imageBuffer = await downloadTelegramFile(config.botToken, telegramFile.file_path);
      const barcode = await decodeEan13FromBuffer(imageBuffer);

      if (!barcode) {
        if (currentAttempt >= config.maxBarcodePhotoAttempts) {
          resetBarcodeFlow(ctx);
          await ctx.reply('Не удалось надежно распознать штрихкод за 3 попытки. Нажмите «Проверить ШК» и попробуйте снова с более четким фото.', mainKeyboard());
          return;
        }

        await ctx.reply(`Штрихкод не удалось распознать или он читается не полностью. Попробуйте еще раз. Попытка ${currentAttempt} из ${config.maxBarcodePhotoAttempts}.`, mainKeyboard());
        return;
      }

      const excelFile = await githubService.getCurrentExcelFile();
      const product = findProductByBarcode(excelFile.buffer, barcode);

      if (!product) {
        resetBarcodeFlow(ctx);
        await ctx.reply(`ШК ${barcode} не найден в Excel-файле ${excelFile.name}.`, mainKeyboard());
        return;
      }

      resetBarcodeFlow(ctx);
      await ctx.reply(formatProductMessage(product, barcode), mainKeyboard());
    } catch (error) {
      if (currentAttempt >= config.maxBarcodePhotoAttempts) {
        resetBarcodeFlow(ctx);
        await ctx.reply(`Ошибка обработки фото. Попытки закончились.\n${error.message}`, mainKeyboard());
        return;
      }

      await ctx.reply(`Не удалось обработать фото. Попробуйте еще раз. Попытка ${currentAttempt} из ${config.maxBarcodePhotoAttempts}.\n${error.message}`, mainKeyboard());
    }
  });

  bot.on('message', async (ctx) => {
    if (ctx.session.flow === 'awaiting_excel') {
      await ctx.reply('Сейчас ожидается Excel-файл. Нажмите «Загрузить файл» и отправьте документ формата .xlsx или .xls.', mainKeyboard());
      return;
    }

    if (ctx.session.flow === 'awaiting_barcode_photo') {
      await ctx.reply('Сейчас ожидается фото штрихкода. Отправьте фото, чтобы бот попробовал считать EAN-13.', mainKeyboard());
      return;
    }

    await ctx.reply('Выберите действие на клавиатуре ниже.', mainKeyboard());
  });

  bot.catch((error) => {
    console.error('Bot error:', error);
  });

  return bot;
}

module.exports = { createBot };
