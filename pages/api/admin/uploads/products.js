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

async function readUpload(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_PRODUCT_IMAGE_SIZE) throw new Error("FILE_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method))
    return methodNotAllowed(res, ["POST", "DELETE"]);
  const admin = await authorizeAdminRequest(req, res, {
    mutation: true,
    maxBodySize: MAX_PRODUCT_IMAGE_SIZE,
  });
  if (!admin) return;

  try {
    if (req.method === "DELETE") {
      const removed = await deleteProductImage(req.query.url);
      return res.status(200).json({ success: true, data: { removed } });
    }

    const image = await saveProductImage({
      buffer: await readUpload(req),
      claimedMime: req.headers["content-type"],
      productSlug: req.headers["x-product-slug"],
      colourSlug: req.headers["x-colour-slug"],
      imageType: req.headers["x-image-type"],
      imageKey: req.headers["x-image-key"],
      replaceUrl: req.headers["x-replace-url"],
    });
    return res.status(201).json({ success: true, data: image });
  } catch (error) {
    if (error.message === "FILE_TOO_LARGE")
      return adminError(
        res,
        413,
        "FILE_TOO_LARGE",
        "Images must be 10 MB or smaller.",
      );
    if (error.message === "INVALID_IMAGE_TYPE")
      return adminError(
        res,
        415,
        "INVALID_IMAGE_TYPE",
        "Choose a JPG, JPEG, PNG, or WebP image.",
      );
    if (error.message === "EMPTY_FILE")
      return adminError(res, 400, "EMPTY_FILE", "The selected image is empty.");
    return handleAdminFailure(error, res, "Product image upload error");
  }
}
