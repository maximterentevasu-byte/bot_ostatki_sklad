const { Markup } = require('telegraf');

const keyboard = Markup.keyboard([
  ['Загрузить файл'],
  ['Проверить ШК']
]).resize();

async function handleStart(ctx) {
  await ctx.reply(
    'Нажми "Загрузить файл", чтобы загрузить базу.\n\nНажми "Проверить ШК", чтобы проверить остатки в базе.',
    keyboard
  );
}

async function handleCheckBarcodePlaceholder(ctx) {
  await ctx.reply('Кнопка "Проверить ШК" пока в разработке. Сейчас работает только загрузка Excel файла в GitHub.');
}

async function handleUploadButton(ctx) {
  await ctx.reply('Отправь Excel файл в этот чат. Поддерживаются форматы .xlsx и .xls. После загрузки я отправлю его в GitHub.');
}

module.exports = {
  handleStart,
  handleCheckBarcodePlaceholder,
  handleUploadButton,
  keyboard
};
