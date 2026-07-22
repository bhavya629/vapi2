import {
  saveBrand,
  setBrandActive,
} from "@/server/admin/adminCatalogueService";
import {
  adminError,
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (!["PATCH", "DELETE"].includes(req.method))
    return methodNotAllowed(res, ["PATCH", "DELETE"]);
  const admin = await authorizeAdminRequest(req, res, { mutation: true });
  if (!admin) return;
  try {
    const id = String(req.query.id || "");
    if (req.method === "DELETE") {
      const result = await setBrandActive(id, false, admin);
      return result
        ? res.status(200).json({ success: true, data: result })
        : adminError(res, 404, "NOT_FOUND", "Brand not found.");
    }
    if (
      Object.keys(req.body || {}).length === 1 &&
      typeof req.body.isActive === "boolean"
    ) {
      const result = await setBrandActive(id, req.body.isActive, admin);
      return result
        ? res.status(200).json({ success: true, data: result })
        : adminError(res, 404, "NOT_FOUND", "Brand not found.");
    }
    const result = await saveBrand(id, req.body, admin);
    if (result.fields)
      return adminError(
        res,
        400,
        "VALIDATION_ERROR",
        "Please correct the highlighted fields.",
        result.fields,
      );
    return res.status(200).json({ success: true, data: result });
  } catch (e) {
    return handleAdminFailure(e, res, "Admin brand error");
  }
}
