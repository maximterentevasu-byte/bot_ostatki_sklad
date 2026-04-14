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
  hints.set(DecodeHintType.ALSO_INVERTED, true);
  reader.setHints(hints);
  return reader;
}

function buildBaseVariants(image) {
  return [
    image.clone(),
    image.clone().greyscale(),
    image.clone().greyscale().normalize(),
    image.clone().greyscale().contrast(0.35),
    image.clone().greyscale().contrast(0.65),
    image.clone().greyscale().normalize().contrast(0.5),
    image.clone().greyscale().normalize().posterize(3),
    image.clone().greyscale().normalize().invert(),
    image.clone().greyscale().blur(1).contrast(0.55),
    image.clone().greyscale().resize(Math.max(image.bitmap.width * 2, 1200), Jimp.AUTO),
    image.clone().greyscale().normalize().resize(Math.max(image.bitmap.width * 2, 1200), Jimp.AUTO),
    image.clone().rotate(90),
    image.clone().rotate(270)
  ];
}

function buildCropVariants(image) {
  const { width, height } = image.bitmap;
  const variants = [];
  const cropConfigs = [
    { x: 0, y: 0.15, w: 1, h: 0.7 },
    { x: 0.05, y: 0.2, w: 0.9, h: 0.6 },
    { x: 0.1, y: 0.25, w: 0.8, h: 0.5 },
    { x: 0.15, y: 0.1, w: 0.7, h: 0.8 }
  ];

  for (const cfg of cropConfigs) {
    const x = Math.max(0, Math.floor(width * cfg.x));
    const y = Math.max(0, Math.floor(height * cfg.y));
    const w = Math.min(width - x, Math.floor(width * cfg.w));
    const h = Math.min(height - y, Math.floor(height * cfg.h));

    if (w < 80 || h < 80) {
      continue;
    }

    const cropped = image.clone().crop(x, y, w, h);
    variants.push(cropped.clone().greyscale().normalize());
    variants.push(cropped.clone().greyscale().normalize().contrast(0.6));
    variants.push(cropped.clone().greyscale().normalize().resize(Math.max(w * 2, 1200), Jimp.AUTO));
  }

  return variants;
}

function buildStripVariants(image) {
  const { width, height } = image.bitmap;
  const variants = [];
  const strips = [0.25, 0.33, 0.5];

  for (const ratio of strips) {
    const stripHeight = Math.max(80, Math.floor(height * ratio));
    const positions = [
      Math.floor((height - stripHeight) / 2),
      Math.floor(height * 0.15),
      Math.floor(height * 0.35)
    ];

    for (const y of positions) {
      const safeY = Math.min(Math.max(0, y), Math.max(0, height - stripHeight));
      const strip = image.clone().crop(0, safeY, width, stripHeight);
      variants.push(strip.clone().greyscale().normalize());
      variants.push(strip.clone().greyscale().normalize().contrast(0.7));
      variants.push(strip.clone().greyscale().normalize().resize(Math.max(width * 2, 1400), Jimp.AUTO));
    }
  }

  return variants;
}

function buildVariants(image) {
  return [
    ...buildBaseVariants(image),
    ...buildCropVariants(image),
    ...buildStripVariants(image)
  ];
}

function tryDecode(reader, image) {
  try {
    const result = reader.decode(bitmapFromJimp(image));
    const text = String(result?.getText?.() ?? result?.text ?? '').trim();
    return isValidEan13(text) ? text : null;
  } catch (error) {
    if (!(error instanceof NotFoundException)) {
      return null;
    }
    return null;
  } finally {
    reader.reset();
  }
}

async function decodeEan13FromBuffer(buffer) {
  const original = await Jimp.read(buffer);
  const reader = buildReader();
  const variants = buildVariants(original);
  const seen = new Set();

  for (const variant of variants) {
    const key = `${variant.bitmap.width}x${variant.bitmap.height}:${variant.hash()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const decoded = tryDecode(reader, variant);
    if (decoded) {
      return decoded;
    }
  }

  return null;
}

module.exports = { decodeEan13FromBuffer };
