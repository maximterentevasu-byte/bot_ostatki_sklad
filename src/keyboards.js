const { Markup } = require('telegraf');

function mainKeyboard() {
  return Markup.keyboard([
    ['Загрузить файл', 'Проверить ШК']
  ]).resize();
}

module.exports = { mainKeyboard };
