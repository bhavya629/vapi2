import { inventoryHistory } from "@/server/admin/adminCatalogueService";
import { variantInventoryHistory } from "@/server/admin/variantAdminService";
import {
  adminError,
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    const key = String(req.query.productId || "");
    const result =
      (await variantInventoryHistory(key)) ||
      (await inventoryHistory(key, req.query));
    return result
      ? res.status(200).json({ success: true, data: result })
      : adminError(res, 404, "NOT_FOUND", "Product not found.");
  } catch (e) {
    return handleAdminFailure(e, res, "Inventory history error");
  }
}
