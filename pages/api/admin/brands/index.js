import {
  listAdminBrands,
  saveBrand,
} from "@/server/admin/adminCatalogueService";
import {
  adminError,
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method))
    return methodNotAllowed(res, ["GET", "POST"]);
  const admin = await authorizeAdminRequest(req, res, {
    mutation: req.method === "POST",
  });
  if (!admin) return;
  try {
    if (req.method === "GET")
      return res.status(200).json({
        success: true,
        data: { brands: await listAdminBrands(req.query) },
      });
    const result = await saveBrand(null, req.body, admin);
    if (result.fields)
      return adminError(
        res,
        400,
        "VALIDATION_ERROR",
        "Please correct the highlighted fields.",
        result.fields,
      );
    return res.status(201).json({ success: true, data: result });
  } catch (e) {
    return handleAdminFailure(e, res, "Admin brands error");
  }
}
