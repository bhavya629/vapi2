import { authorizeDelivery, deliveryError } from "@/server/http/deliveryApi";
import {
  listDeliveryOrders,
  DeliveryOperationError,
} from "@/server/delivery/operationsService";
export default async function handler(req, res) {
  if (req.method !== "GET")
    return deliveryError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  const user = await authorizeDelivery(req, res);
  if (!user) return;
  try {
    return res.json({
      success: true,
      data: await listDeliveryOrders(user, req.query),
    });
  } catch (e) {
    if (e instanceof DeliveryOperationError)
      return deliveryError(res, e.status, e.code, e.message);
    console.error(e);
    return deliveryError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to load delivery orders.",
    );
  }
}
