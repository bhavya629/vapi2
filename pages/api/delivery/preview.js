import {
  allowMethods,
  requireCustomer,
  sendError,
} from "@/server/http/customerApi";
import {
  getOwnedAddress,
  validateAddress,
  AddressError,
} from "@/server/addresses/addressService";
import {
  previewDelivery,
  DeliveryError,
} from "@/server/delivery/deliveryService";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  try {
    const fulfilmentMethod = req.body?.fulfilmentMethod || "DELIVERY";
    let address = null;
    if (fulfilmentMethod === "DELIVERY") {
      address = req.body?.addressId
        ? await getOwnedAddress(user.id, String(req.body.addressId))
        : validateAddress(req.body?.address || {});
    }
    return res.json({
      success: true,
      data: await previewDelivery({ address, fulfilmentMethod }),
    });
  } catch (e) {
    if (e instanceof AddressError || e instanceof DeliveryError)
      return sendError(res, e.status, e.code, e.message, e.details);
    console.error("delivery preview", e);
    return sendError(res, 500, "INTERNAL_ERROR", "Unable to preview delivery.");
  }
}
