import {
  authorizeAdminRequest,
  adminError,
  methodNotAllowed,
} from "@/server/http/adminApi";
import {
  AdminOrderError,
  updateStatus,
} from "@/server/orders/adminOrderService";
export default async function handler(req, res) {
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  const admin = await authorizeAdminRequest(req, res, { mutation: true });
  if (!admin) return;
  try {
    return res.json({
      success: true,
      data: {
        order: await updateStatus(
          String(req.query.identifier),
          req.body,
          admin,
        ),
      },
    });
  } catch (e) {
    if (e instanceof AdminOrderError)
      return adminError(res, e.status, e.code, e.message);
    console.error("status update", e);
    return adminError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to update order status.",
    );
  }
}
