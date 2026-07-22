import {
  authorizeAdminRequest,
  adminError,
  methodNotAllowed,
} from "@/server/http/adminApi";
import {
  AdminOrderError,
  listAdminOrders,
} from "@/server/orders/adminOrderService";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.json({ success: true, data: await listAdminOrders(req.query) });
  } catch (e) {
    if (e instanceof AdminOrderError)
      return adminError(res, e.status, e.code, e.message);
    console.error("admin orders list", e);
    return adminError(res, 500, "INTERNAL_ERROR", "Unable to load orders.");
  }
}
