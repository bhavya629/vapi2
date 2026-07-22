import { authorizeDelivery, deliveryError } from "@/server/http/deliveryApi";
import {
  confirmShipping,
  DeliveryOperationError,
} from "@/server/delivery/operationsService";
export default async function handler(req, res) {
  if (req.method !== "POST")
    return deliveryError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  const u = await authorizeDelivery(req, res, true);
  if (!u) return;
  try {
    return res
      .status(201)
      .json({
        success: true,
        data: await confirmShipping(
          u,
          String(req.query.orderId),
          req.body || {},
        ),
      });
  } catch (e) {
    if (e instanceof DeliveryOperationError)
      return deliveryError(res, e.status, e.code, e.message);
    console.error(e);
    return deliveryError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to confirm shipping.",
    );
  }
}
