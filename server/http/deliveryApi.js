import { requireDeliveryOperator } from "@/server/auth/deliveryAuth";
export function deliveryError(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } });
}
export async function authorizeDelivery(req, res, mutation = false) {
  if (mutation) {
    const origin = req.headers.origin;
    if (origin) {
      try {
        if (new URL(origin).host !== req.headers.host) {
          deliveryError(
            res,
            403,
            "INVALID_ORIGIN",
            "Request origin was rejected.",
          );
          return null;
        }
      } catch {
        deliveryError(
          res,
          403,
          "INVALID_ORIGIN",
          "Request origin was rejected.",
        );
        return null;
      }
    }
  }
  const auth = await requireDeliveryOperator(req);
  if (auth.error) {
    deliveryError(res, auth.status, auth.error.code, auth.error.message);
    return null;
  }
  return auth.user;
}
