import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetRoot = resolve(root, "public/assets/moyoy-candidate");
const sourceRoot = process.argv
  .find((argument) => argument.startsWith("--source-root="))
  ?.slice("--source-root=".length);
const chapters = ["root", "dusk", "dawn", "alpine"];

if (!sourceRoot) {
  throw new Error(
    "Pass --source-root=<approved local source directory> to derive wide photographs.",
  );
}

async function writeAlphaMask(sourcePath, targetPath) {
  const source = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(source.info.width * source.info.height * 4);

  for (let pixel = 0; pixel < source.info.width * source.info.height; pixel += 1) {
    const sourceOffset = pixel * source.info.channels;
    const targetOffset = pixel * 4;
    rgba[targetOffset] = 255;
    rgba[targetOffset + 1] = 255;
    rgba[targetOffset + 2] = 255;
    rgba[targetOffset + 3] = source.data[sourceOffset + source.info.channels - 1];
  }

  await sharp(rgba, {
    raw: { channels: 4, height: source.info.height, width: source.info.width },
  })
    .webp({ effort: 6, lossless: true })
    .toFile(targetPath);
}

async function writeWidePhotograph(chapter) {
  const existingPath = resolve(assetRoot, `photo/pc-2400-${chapter}.webp`);
  const sourcePath = resolve(sourceRoot, `chapter-${chapter}-native-candidate.jpg`);
  const existing = await sharp(existingPath).metadata();
  const width = 2560;
  const height = Math.round((existing.height / existing.width) * width);
  const photo = await sharp(sourcePath)
    .resize({ fit: "fill", height, kernel: "lanczos3", width })
    .ensureAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = await sharp(existingPath)
    .ensureAlpha()
    .resize({ fit: "fill", height, kernel: "nearest", width })
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    photo.data[pixel * photo.info.channels + photo.info.channels - 1] =
      alpha.data[pixel];
  }

  await sharp(photo.data, {
    raw: { channels: photo.info.channels, height, width },
  })
    .toColourspace("srgb")
    .webp({ effort: 6, quality: 88 })
    .toFile(resolve(assetRoot, `photo/pc-2560-${chapter}.webp`));
}

await mkdir(resolve(assetRoot, "mask"), { recursive: true });
await Promise.all(
  chapters.flatMap((chapter) => [
    writeAlphaMask(
      resolve(assetRoot, `photo/pc-${chapter}.webp`),
      resolve(assetRoot, `mask/mask-pc-${chapter}.webp`),
    ),
    writeAlphaMask(
      resolve(assetRoot, `photo/sp-${chapter}.webp`),
      resolve(assetRoot, `mask/mask-sp-${chapter}.webp`),
    ),
    writeWidePhotograph(chapter),
  ]),
);
