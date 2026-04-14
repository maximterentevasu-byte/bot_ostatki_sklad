const path = require('path');
const { Telegraf, session } = require('telegraf');
const { mainKeyboard, barcodeKeyboard } = require('./keyboards');
const { GitHubService } = require('./services/github');
const { downloadTelegramFile } = require('./services/telegram');
const { decodeEan13FromBuffer } = require('./services/barcode');
const { findProductByBarcode } = require('./services/excel');
const { formatProductMessage } = require('./messages');
const { normalizeDigits, isValidEan13 } = require('./utils/ean13');

function createDefaultSession() {
  return {
    flow: 'idle',
    photoAttempts: 0
  };
}

function ensureSession(ctx) {
  if (!ctx.session) {
    ctx.session = createDefaultSession();
    return;
  }

  if (!ctx.session.flow) {
    ctx.session.flow = 'idle';
  }

  if (typeof ctx.session.photoAttempts !== 'number') {
    ctx.session.photoAttempts = 0;
  }
}

function resetBarcodeFlow(ctx) {
  ensureSession(ctx);
  ctx.session.flow = 'idle';
  ctx.session.photoAttempts = 0;
}

function armBarcodeFlow(ctx) {
  ensureSession(ctx);
  ctx.session.flow = 'awaiting_barcode_photo';
  ctx.session.photoAttempts = 0;
}

function armManualBarcodeFlow(ctx) {
  ensureSession(ctx);
  ctx.session.flow = 'awaiting_manual_barcode';
}

async function replyWithLookupResult(ctx, excelFile, barcode) {
  const product = findProductByBarcode(excelFile.buffer, barcode);

  if (!product) {
    await ctx.reply(
      `ШК ${barcode} не найден в Excel-файле ${excelFile.name}.\n\n` +
      'Можете сразу отправить следующее фото штрихкода или ввести ШК вручную.',
      barcodeKeyboard()
    );
    return;
  }

  await ctx.reply(
    `${formatProductMessage(product, barcode)}\n\nОтправьте следующее фото штрихкода для новой проверки.`,
    barcodeKeyboard()
  );
}

function createBot(config) {
  const bot = new Telegraf(config.botToken);
  const githubService = new GitHubService(config);

  bot.use(session({ defaultSession: createDefaultSession }));
  bot.use((ctx, next) => {
    ensureSession(ctx);
    return next();
  });

  bot.start(async (ctx) => {
    resetBarcodeFlow(ctx);
    await ctx.reply(
      `Нажми «Загрузить файл», чтобы загрузить базу.\n` +
      `Нажми «Проверить ШК», чтобы запустить непрерывную проверку по фото.\n` +
      `Если фото не читается — можно выбрать «Ввести ШК вручную».`,
      mainKeyboard()
    );
  });

  bot.hears('Загрузить файл', async (ctx) => {
    resetBarcodeFlow(ctx);
    ctx.session.flow = 'awaiting_excel';
    await ctx.reply('Отправьте Excel-файл в этот чат. Старый файл в папке GitHub будет удален, новый — загружен вместо него.', mainKeyboard());
  });

  bot.hears('Проверить ШК', async (ctx) => {
    armBarcodeFlow(ctx);
    await ctx.reply(
      'Отправьте фото штрихкода. После каждой обработки бот останется в режиме сканирования, и можно сразу отправлять следующее фото. ' +
      'Если фото не распознается, используйте кнопку «Ввести ШК вручную».',
      barcodeKeyboard()
    );
  });

  bot.hears('Ввести ШК вручную', async (ctx) => {
    armManualBarcodeFlow(ctx);
    await ctx.reply('Введите штрихкод вручную. Поддерживается только EAN-13: 13 цифр без пробелов и лишних символов.', barcodeKeyboard());
  });

  bot.on('document', async (ctx) => {
    ensureSession(ctx);

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
    ensureSession(ctx);

    if (ctx.session.flow !== 'awaiting_barcode_photo') {
      await ctx.reply('Нажмите «Проверить ШК», чтобы начать проверку по фото штрихкода.', mainKeyboard());
      return;
    }

    const currentAttempt = ctx.session.photoAttempts + 1;
    ctx.session.photoAttempts = currentAttempt;

    try {
      const photos = ctx.message.photo || [];
      const largestPhoto = photos[photos.length - 1];

      if (!largestPhoto) {
        throw new Error('Telegram не передал фото для обработки.');
      }

      const telegramFile = await ctx.telegram.getFile(largestPhoto.file_id);
      const imageBuffer = await downloadTelegramFile(config.botToken, telegramFile.file_path);
      const barcode = await decodeEan13FromBuffer(imageBuffer);

      if (!barcode) {
        if (currentAttempt >= config.maxBarcodePhotoAttempts) {
          ctx.session.photoAttempts = 0;
          await ctx.reply(
            'Не удалось надежно распознать штрихкод по фото.\n\n' +
            'Можно:\n' +
            '• отправить новое, более четкое фото;\n' +
            '• нажать «Ввести ШК вручную».',
            barcodeKeyboard()
          );
          return;
        }

        await ctx.reply(
          `Штрихкод не удалось распознать. Попробуйте еще раз. Попытка ${currentAttempt} из ${config.maxBarcodePhotoAttempts}.\n\n` +
          'Если фото проблемное, нажмите «Ввести ШК вручную».',
          barcodeKeyboard()
        );
        return;
      }

      ctx.session.photoAttempts = 0;
      const excelFile = await githubService.getCurrentExcelFile();
      await replyWithLookupResult(ctx, excelFile, barcode);
    } catch (error) {
      if (currentAttempt >= config.maxBarcodePhotoAttempts) {
        ctx.session.photoAttempts = 0;
        await ctx.reply(
          `Ошибка обработки фото.\n${error.message}\n\nМожно отправить новое фото или нажать «Ввести ШК вручную».`,
          barcodeKeyboard()
        );
        return;
      }

      await ctx.reply(
        `Не удалось обработать фото. Попробуйте еще раз. Попытка ${currentAttempt} из ${config.maxBarcodePhotoAttempts}.\n${error.message}\n\n` +
        'Если нужно, используйте «Ввести ШК вручную».',
        barcodeKeyboard()
      );
    }
  });

  bot.on('text', async (ctx, next) => {
    ensureSession(ctx);

    const text = String(ctx.message.text || '').trim();
    if (!text) {
      return next();
    }

    if (['/start', 'Загрузить файл', 'Проверить ШК', 'Ввести ШК вручную'].includes(text)) {
      return next();
    }

    if (ctx.session.flow === 'awaiting_manual_barcode') {
      const barcode = normalizeDigits(text);
      if (!isValidEan13(barcode)) {
        await ctx.reply('Неверный формат штрихкода. Введите ровно 13 цифр EAN-13.', barcodeKeyboard());
        return;
      }

      try {
        const excelFile = await githubService.getCurrentExcelFile();
        armBarcodeFlow(ctx);
        await replyWithLookupResult(ctx, excelFile, barcode);
      } catch (error) {
        await ctx.reply(`Не удалось проверить ШК вручную.\n${error.message}`, barcodeKeyboard());
      }
      return;
    }

    return next();
  });

  bot.on('message', async (ctx) => {
    ensureSession(ctx);

    if (ctx.message.photo || ctx.message.document) {
      return;
    }

    if (ctx.session.flow === 'awaiting_excel') {
      await ctx.reply('Сейчас ожидается Excel-файл. Нажмите «Загрузить файл» и отправьте документ формата .xlsx или .xls.', mainKeyboard());
      return;
    }

    if (ctx.session.flow === 'awaiting_barcode_photo') {
      await ctx.reply('Сейчас ожидается фото штрихкода. Отправьте фото или выберите «Ввести ШК вручную».', barcodeKeyboard());
      return;
    }

    if (ctx.session.flow === 'awaiting_manual_barcode') {
      await ctx.reply('Сейчас ожидается ручной ввод ШК. Введите 13 цифр EAN-13 или отправьте фото после нажатия «Проверить ШК».', barcodeKeyboard());
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
