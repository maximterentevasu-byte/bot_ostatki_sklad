require('dotenv').config();

const { getConfig } = require('./config');
const { createBot } = require('./bot');

async function bootstrap() {
  const config = getConfig();
  const bot = createBot(config);

  await bot.launch();
  console.log('Telegram bot started');

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, stopping bot...`);
    await bot.stop(signal);
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
