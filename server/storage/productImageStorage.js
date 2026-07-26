import { v2 as cloudinary } from "cloudinary";

export const MAX_PRODUCT_IMAGE_SIZE = 8 * 1024 * 1024;
export const PRODUCT_UPLOAD_FOLDER = "cellphone-studio/products";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function configureCloudinary() {
  const cloud_name = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const api_key = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const api_secret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

  console.info("Cloudinary configuration check:", {
    cloudNameExists: Boolean(cloud_name),
    cloudNameLength: cloud_name.length,
    apiKeyExists: Boolean(api_key),
    apiKeyLength: api_key.length,
    apiSecretExists: Boolean(api_secret),
    apiSecretLength: api_secret.length,
  });

  if (!cloud_name || !api_key || !api_secret)
    throw new Error("CLOUDINARY_CONFIGURATION_MISSING");

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
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

function publicIdFromUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || !url.hostname.endsWith("res.cloudinary.com"))
      return null;
    const marker = `/${PRODUCT_UPLOAD_FOLDER}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    const relative = decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length),
    ).replace(/\.[^/.]+$/, "");
    return relative ? `${PRODUCT_UPLOAD_FOLDER}/${relative}` : null;
  } catch {
    return null;
  }
}

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: PRODUCT_UPLOAD_FOLDER,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

export async function saveProductImage({ buffer, claimedMime, replaceUrl }) {
  if (!buffer.length) throw new Error("EMPTY_FILE");
  if (buffer.length > MAX_PRODUCT_IMAGE_SIZE) throw new Error("FILE_TOO_LARGE");
  const mime = detectedMime(buffer);
  if (!mime || !ALLOWED_MIME_TYPES.has(claimedMime) || claimedMime !== mime)
    throw new Error("INVALID_IMAGE_TYPE");

  configureCloudinary();
  const result = await uploadBuffer(buffer);
  if (replaceUrl && replaceUrl !== result.secure_url)
    await deleteProductImage(replaceUrl);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    mime,
    size: buffer.length,
  };
}

export async function deleteProductImage(value) {
  const publicId = String(value || "").startsWith(`${PRODUCT_UPLOAD_FOLDER}/`)
    ? String(value)
    : publicIdFromUrl(value);
  if (!publicId) return false;
  configureCloudinary();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
  return result.result === "ok";
}
