require('@zxing/text-encoding');

const Jimp = require('jimp');
const {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
  BarcodeFormat,
  NotFoundException
} = require('@zxing/library');
const { isValidEan13 } = require('../utils/ean13');

function bitmapFromJimp(image) {
  const { data, width, height } = image.bitmap;
  const luminances = new Uint8ClampedArray(width * height);

  for (let src = 0, dst = 0; src < data.length; src += 4, dst += 1) {
    const r = data[src];
    const g = data[src + 1];
    const b = data[src + 2];
    luminances[dst] = Math.trunc((r + g + b) / 3);
  }

  const source = new RGBLuminanceSource(luminances, width, height);
  return new BinaryBitmap(new HybridBinarizer(source));
}

function buildReader() {
  const reader = new MultiFormatReader();
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  return reader;
}

function buildVariants(image) {
  const variants = [];
  variants.push(image.clone());
  variants.push(image.clone().greyscale().contrast(0.4));
  variants.push(image.clone().greyscale().normalize());
  variants.push(image.clone().greyscale().contrast(0.7));
  variants.push(image.clone().rotate(90));
  variants.push(image.clone().rotate(270));
  return variants;
}

async function decodeEan13FromBuffer(buffer) {
  const original = await Jimp.read(buffer);
  const reader = buildReader();
  const variants = buildVariants(original);

  for (const variant of variants) {
    try {
      const result = reader.decode(bitmapFromJimp(variant));
      const text = String(result?.getText?.() ?? result?.text ?? '').trim();
      if (isValidEan13(text)) {
        return text;
      }
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        // continue to next variant
      }
    } finally {
      reader.reset();
    }
  }

  return null;
}

module.exports = { decodeEan13FromBuffer };
