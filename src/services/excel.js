const XLSX = require('xlsx');
const { normalizeDigits } = require('../utils/ean13');

function getCell(worksheet, rowIndex, colIndex) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  return worksheet[address]?.v;
}

function toDisplay(value) {
  return value ?? '—';
}

function findProductByBarcode(buffer, barcode) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet || !worksheet['!ref']) {
    throw new Error('Excel-файл пустой или не содержит листов.');
  }

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const target = normalizeDigits(barcode);

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const barcodeValue = normalizeDigits(getCell(worksheet, row, 3)); // D
    if (barcodeValue === target) {
      return {
        rowNumber: row + 1,
        productName: toDisplay(getCell(worksheet, row, 2)), // C
        totalStock: toDisplay(getCell(worksheet, row, 6)), // G
        promoStock: toDisplay(getCell(worksheet, row, 5)), // F
        warehouseStock: toDisplay(getCell(worksheet, row, 7)), // H
        kamenskayaStock: toDisplay(getCell(worksheet, row, 8)), // I
        pobedyStock: toDisplay(getCell(worksheet, row, 10)), // K
        asbestStock: toDisplay(getCell(worksheet, row, 9)), // J
        sales14Days: toDisplay(getCell(worksheet, row, 11)) // L
      };
    }
  }

  return null;
}

module.exports = { findProductByBarcode };
