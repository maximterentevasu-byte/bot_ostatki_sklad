function normalizeDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function isValidEan13(barcode) {
  const digits = normalizeDigits(barcode);
  if (!/^\d{13}$/.test(digits)) {
    return false;
  }

  const numbers = digits.split('').map(Number);
  const checksum = numbers.pop();
  let sum = 0;

  for (let i = 0; i < numbers.length; i += 1) {
    sum += numbers[i] * (i % 2 === 0 ? 1 : 3);
  }

  const control = (10 - (sum % 10)) % 10;
  return checksum === control;
}

module.exports = {
  normalizeDigits,
  isValidEan13
};
