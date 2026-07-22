import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024;
export const PRODUCT_UPLOAD_URL = "/uploads/products";

const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function safeSegment(value, fallback) {
  const segment = String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return segment || fallback;
}

function detectedMime(buffer) {
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "image/jpeg";
  return null;
}

function uploadRoot() {
  return path.resolve(process.cwd(), "public", "uploads", "products");
}

function localPathFromUrl(url) {
  if (!String(url || "").startsWith(`${PRODUCT_UPLOAD_URL}/`)) return null;
  const relative = decodeURIComponent(
    String(url).slice(PRODUCT_UPLOAD_URL.length + 1),
  );
  const root = uploadRoot();
  const target = path.resolve(root, relative);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

export async function saveProductImage({
  buffer,
  claimedMime,
  productSlug,
  colourSlug,
  imageType,
  imageKey,
  replaceUrl,
}) {
  if (!buffer.length) throw new Error("EMPTY_FILE");
  if (buffer.length > MAX_PRODUCT_IMAGE_SIZE) throw new Error("FILE_TOO_LARGE");
  const mime = detectedMime(buffer);
  if (!mime || !MIME_EXTENSIONS[mime] || claimedMime !== mime)
    throw new Error("INVALID_IMAGE_TYPE");

  const product = safeSegment(productSlug, "draft-product");
  const colour = safeSegment(colourSlug, "default");
  const type = safeSegment(imageType, "image");
  const key = safeSegment(imageKey, "image").slice(-24);
  const baseName = type === "other" ? `other-${key}` : type;
  const extension = MIME_EXTENSIONS[mime];
  const directory = path.join(uploadRoot(), product, colour);
  const target = path.join(directory, `${baseName}.${extension}`);
  const temporary = `${target}.${process.pid}-${Date.now()}.tmp`;

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, buffer, { flag: "wx" });
  await unlink(target).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await rename(temporary, target);

  const url = `${PRODUCT_UPLOAD_URL}/${product}/${colour}/${baseName}.${extension}`;
  if (replaceUrl && replaceUrl !== url) await deleteProductImage(replaceUrl);
  return { url, mime, size: buffer.length };
}

export async function deleteProductImage(url) {
  const target = localPathFromUrl(url);
  if (!target) return false;
  try {
    await unlink(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
