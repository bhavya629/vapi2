import {
  authorizeAdminRequest,
  adminError,
  methodNotAllowed,
} from "@/server/http/adminApi";
import {
  getDeliverySettings,
  serializeSettings,
} from "@/server/delivery/deliveryService";
import { prisma } from "@/lib/prisma";
export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method))
    return methodNotAllowed(res, ["GET", "PATCH"]);
  if (
    !(await authorizeAdminRequest(req, res, {
      mutation: req.method === "PATCH",
    }))
  )
    return;
  try {
    if (req.method === "GET")
      return res.json({
        success: true,
        data: serializeSettings(await getDeliverySettings()),
      });
    const b = req.body || {},
      lat = b.storeLatitude === "" ? null : Number(b.storeLatitude),
      lng = b.storeLongitude === "" ? null : Number(b.storeLongitude),
      radius = Number(b.localRadiusKm),
      charge = Number(b.localDeliveryCharge),
      cutoff = String(b.sameDayCutoff || "");
    if (
      (lat == null) !== (lng == null) ||
      (lat != null &&
        (!Number.isFinite(lat) ||
          Math.abs(lat) > 90 ||
          !Number.isFinite(lng) ||
          Math.abs(lng) > 180))
    )
      return adminError(
        res,
        422,
        "INVALID_COORDINATES",
        "Store coordinates are invalid.",
      );
    if (
      !Number.isFinite(radius) ||
      radius <= 0 ||
      !Number.isFinite(charge) ||
      charge !== 350
    )
      return adminError(
        res,
        422,
        "INVALID_SETTINGS",
        "Local radius must be positive and the Phase 10 local delivery charge must remain ₹350.",
      );
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff))
      return adminError(
        res,
        422,
        "INVALID_CUTOFF",
        "Use 24-hour HH:MM format.",
      );
    const updated = await prisma.deliverySettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        storeName: String(b.storeName || "The Cellphone Studio").trim(),
        storeAddress: String(b.storeAddress || "Vapi, Gujarat, India").trim(),
        storeLatitude: lat,
        storeLongitude: lng,
        localRadiusKm: radius,
        localDeliveryCharge: 350,
        sameDayCutoff: cutoff,
        sameDayEnabled: b.sameDayEnabled !== false,
        indiaShippingEnabled: b.indiaShippingEnabled !== false,
      },
      update: {
        storeName: String(b.storeName || "").trim(),
        storeAddress: String(b.storeAddress || "").trim(),
        storeLatitude: lat,
        storeLongitude: lng,
        localRadiusKm: radius,
        localDeliveryCharge: 350,
        sameDayCutoff: cutoff,
        sameDayEnabled: Boolean(b.sameDayEnabled),
        indiaShippingEnabled: Boolean(b.indiaShippingEnabled),
      },
    });
    return res.json({ success: true, data: serializeSettings(updated) });
  } catch (e) {
    console.error(e);
    return adminError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to update delivery settings.",
    );
  }
}
