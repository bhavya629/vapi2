import { authorizeDelivery, deliveryError } from "@/server/http/deliveryApi";
import { deliveryEarnings } from "@/server/delivery/operationsService";
export default async function handler(req, res) {
  if (req.method !== "GET")
    return deliveryError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  const u = await authorizeDelivery(req, res);
  if (!u) return;
  try {
    return res.json({ success: true, data: await deliveryEarnings(u) });
  } catch (e) {
    console.error(e);
    return deliveryError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to load delivery earnings.",
    );
  }
}
