import {
  authorizeAdminRequest,
  adminError,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { adminOrder, AdminOrderError } from "@/server/orders/adminOrderService";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.json({
      success: true,
      data: { order: await adminOrder(String(req.query.identifier)) },
    });
  } catch (e) {
    if (e instanceof AdminOrderError)
      return adminError(res, e.status, e.code, e.message);
    console.error("admin order detail", e);
    return adminError(res, 500, "INTERNAL_ERROR", "Unable to load order.");
  }
}
