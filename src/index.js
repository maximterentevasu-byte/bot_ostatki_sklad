const { Telegraf } = require('telegraf');
const config = require('./config');
const {
  handleStart,
  handleCheckBarcodePlaceholder,
  handleUploadButton
} = require('./handlers/start');
const { handleDocument } = require('./handlers/upload');

const bot = new Telegraf(config.botToken);

bot.start(handleStart);
bot.hears('Загрузить файл', handleUploadButton);
bot.hears('Проверить ШК', handleCheckBarcodePlaceholder);
bot.on('document', handleDocument);

bot.catch((error) => {
  console.error('Bot runtime error:', error);
});

async function bootstrap() {
  await bot.launch();
  console.log('Telegram bot started successfully.');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
