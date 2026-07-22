import {
  authorizeAdminRequest,
  adminError,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { orderStats } from "@/server/orders/adminOrderService";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.json({ success: true, data: await orderStats() });
  } catch (e) {
    console.error("order stats", e);
    return adminError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to load order statistics.",
    );
  }
}
