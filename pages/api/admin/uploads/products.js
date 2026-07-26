import Busboy from "busboy";
import {
  deleteProductImage,
  MAX_PRODUCT_IMAGE_SIZE,
  saveProductImage,
} from "@/server/storage/productImageStorage";
import {
  adminError,
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";

export const config = { api: { bodyParser: false } };

function readMultipartUpload(req) {
  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({
        headers: req.headers,
        limits: { fileSize: MAX_PRODUCT_IMAGE_SIZE, files: 1, fields: 10 },
      });
    } catch {
      reject(new Error("INVALID_MULTIPART"));
      return;
    }

    const fields = {};
    const chunks = [];
    let claimedMime = "";
    let receivedFile = false;
    let tooLarge = false;

    parser.on("field", (name, value) => {
      fields[name] = value;
    });
    parser.on("file", (_name, stream, info) => {
      receivedFile = true;
      claimedMime = info.mimeType;
      stream.on("limit", () => {
        tooLarge = true;
      });
      stream.on("data", (chunk) => chunks.push(chunk));
    });
    parser.on("filesLimit", () => reject(new Error("TOO_MANY_FILES")));
    parser.on("error", reject);
    parser.on("finish", () => {
      if (tooLarge) return reject(new Error("FILE_TOO_LARGE"));
      if (!receivedFile) return reject(new Error("EMPTY_FILE"));
      resolve({
        buffer: Buffer.concat(chunks),
        claimedMime,
        replaceUrl: fields.replaceUrl,
      });
    });
    req.pipe(parser);
  });
}

export default async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method))
    return methodNotAllowed(res, ["POST", "DELETE"]);

  try {
    const admin = await authorizeAdminRequest(req, res, {
      mutation: true,
      maxBodySize: MAX_PRODUCT_IMAGE_SIZE + 1024 * 1024,
    });
    if (!admin) return;

    if (req.method === "DELETE") {
      const removed = await deleteProductImage(
        req.query.publicId || req.query.url,
      );
      return res.status(200).json({ success: true, data: { removed } });
    }

    const image = await saveProductImage(await readMultipartUpload(req));
    return res.status(201).json({
      success: true,
      url: image.url,
      publicId: image.publicId,
      data: image,
    });
  } catch (error) {
    if (error.message === "FILE_TOO_LARGE")
      return adminError(res, 413, "FILE_TOO_LARGE", "Images must be 8 MB or smaller.");
    if (error.message === "INVALID_IMAGE_TYPE")
      return adminError(res, 415, "INVALID_IMAGE_TYPE", "Choose a JPG, JPEG, PNG, or WebP image.");
    if (error.message === "EMPTY_FILE")
      return adminError(res, 400, "EMPTY_FILE", "Select an image to upload.");
    if (error.message === "INVALID_MULTIPART")
      return adminError(res, 400, "INVALID_MULTIPART", "Send the image as multipart/form-data.");
    if (error.message === "TOO_MANY_FILES")
      return adminError(res, 400, "TOO_MANY_FILES", "Upload one image at a time.");
    if (error.message === "CLOUDINARY_CONFIGURATION_MISSING")
      return adminError(res, 500, "UPLOAD_SERVICE_NOT_CONFIGURED", "The image upload service is not configured.");
    return handleAdminFailure(error, res, "Product image upload error");
  }
}
