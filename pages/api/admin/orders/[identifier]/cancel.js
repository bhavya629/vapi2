import {
  authorizeAdminRequest,
  adminError,
  methodNotAllowed,
} from "@/server/http/adminApi";
import {
  AdminOrderError,
  cancelOrder,
} from "@/server/orders/adminOrderService";
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const admin = await authorizeAdminRequest(req, res, { mutation: true });
  if (!admin) return;
  try {
    return res.json({
      success: true,
      data: {
        order: await cancelOrder(String(req.query.identifier), req.body, admin),
      },
    });
  } catch (e) {
    if (e instanceof AdminOrderError)
      return adminError(res, e.status, e.code, e.message);
    console.error("order cancel", e);
    return adminError(res, 500, "INTERNAL_ERROR", "Unable to cancel order.");
  }
}
