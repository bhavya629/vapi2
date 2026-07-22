import { listInventory } from "@/server/admin/adminCatalogueService";
import { listVariantInventory } from "@/server/admin/variantAdminService";
import {
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.status(200).json({
      success: true,
      data:
        req.query.type === "SMARTPHONE"
          ? await listVariantInventory(req.query)
          : await listInventory(req.query),
    });
  } catch (e) {
    return handleAdminFailure(e, res, "Admin inventory error");
  }
}
