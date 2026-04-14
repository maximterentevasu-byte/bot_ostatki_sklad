const { Markup } = require('telegraf');

function mainKeyboard() {
  return Markup.keyboard([
    ['Загрузить файл', 'Проверить ШК'],
    ['Ввести ШК вручную']
  ]).resize();
}

function barcodeKeyboard() {
  return Markup.keyboard([
    ['Загрузить файл', 'Проверить ШК'],
    ['Ввести ШК вручную']
  ]).resize();
}

module.exports = { mainKeyboard, barcodeKeyboard };
