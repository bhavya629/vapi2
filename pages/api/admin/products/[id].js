import {
  deactivateProduct,
  getAdminProduct,
  updateProduct,
} from "@/server/admin/adminCatalogueService";
import {
  adminError,
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
import {
  getVariantAdminProduct,
  updateVariantProduct,
} from "@/server/admin/variantAdminService";

export default async function handler(req, res) {
  if (!["GET", "PATCH", "DELETE"].includes(req.method))
    return methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  const admin = await authorizeAdminRequest(req, res, {
    mutation: req.method !== "GET",
  });
  if (!admin) return;
  try {
    const id = String(req.query.id || "");
    if (req.method === "GET") {
      const product = await getVariantAdminProduct(id);
      return product
        ? res.status(200).json({ success: true, data: { product } })
        : adminError(res, 404, "NOT_FOUND", "Product not found.");
    }
    if (req.method === "PATCH") {
      if (req.body?.product) {
        const result = await updateVariantProduct(id, req.body, admin);
        if (!result)
          return adminError(res, 404, "NOT_FOUND", "Product not found.");
        if (result.fields)
          return adminError(
            res,
            400,
            "VALIDATION_ERROR",
            "Please correct the highlighted fields.",
            result.fields,
          );
        return res.status(200).json({ success: true, data: result });
      }
      const existing = await getAdminProduct(id);
      if (!existing)
        return adminError(res, 404, "NOT_FOUND", "Product not found.");
      const nextPrice =
        req.body?.price === undefined ? existing.price : Number(req.body.price);
      if (
        req.body?.originalPrice !== undefined &&
        req.body.originalPrice !== null &&
        Number(req.body.originalPrice) < nextPrice
      )
        return adminError(
          res,
          400,
          "VALIDATION_ERROR",
          "Please correct the highlighted fields.",
          {
            originalPrice: "Original price must be at least the selling price.",
          },
        );
      const result = await updateProduct(id, req.body, admin);
      if (result.fields)
        return adminError(
          res,
          400,
          "VALIDATION_ERROR",
          "Please correct the highlighted fields.",
          result.fields,
        );
      return res.status(200).json({ success: true, data: result });
    }
    const result = await deactivateProduct(id, admin);
    return result
      ? res.status(200).json({ success: true, data: result })
      : adminError(res, 404, "NOT_FOUND", "Product not found.");
  } catch (error) {
    return handleAdminFailure(error, res, "Admin product error");
  }
}
