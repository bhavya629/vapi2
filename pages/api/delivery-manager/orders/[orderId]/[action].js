import { authorizeDelivery, deliveryError } from "@/server/http/deliveryApi";
import {
  assignOrder,
  verifyDistance,
  updateDeliveryStatus,
  updateCourier,
  updateCosts,
  DeliveryOperationError,
} from "@/server/delivery/operationsService";
const actions = {
  assign: (u, id, b) => assignOrder(u, id, b.managerId),
  distance: verifyDistance,
  status: updateDeliveryStatus,
  courier: updateCourier,
  costs: updateCosts,
};
export default async function handler(req, res) {
  if (req.method !== "PATCH")
    return deliveryError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  const user = await authorizeDelivery(req, res, true),
    fn = actions[String(req.query.action)];
  if (!user) return;
  if (!fn)
    return deliveryError(
      res,
      404,
      "ACTION_NOT_FOUND",
      "Delivery action not found.",
    );
  try {
    return res.json({
      success: true,
      data: await fn(user, String(req.query.orderId), req.body || {}),
    });
  } catch (e) {
    if (e instanceof DeliveryOperationError)
      return deliveryError(res, e.status, e.code, e.message);
    console.error(e);
    return deliveryError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to update delivery.",
    );
  }
}
