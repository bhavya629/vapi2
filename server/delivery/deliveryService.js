import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "./distance";

export class DeliveryError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
export const deliverySettingsSelect = {
  id: true,
  storeName: true,
  storeAddress: true,
  storeLatitude: true,
  storeLongitude: true,
  localRadiusKm: true,
  localDeliveryCharge: true,
  sameDayCutoff: true,
  sameDayEnabled: true,
  indiaShippingEnabled: true,
  updatedAt: true,
};

export async function getDeliverySettings(client = prisma) {
  return client.deliverySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: deliverySettingsSelect,
  });
}
export function serializeSettings(value) {
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      v && typeof v === "object" && typeof v.toNumber === "function"
        ? v.toNumber()
        : v,
    ]),
  );
}

function beforeCutoff(cutoff, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(now) <= cutoff;
}
export async function previewDelivery(
  { address, fulfilmentMethod = "DELIVERY", now = new Date() },
  client = prisma,
) {
  const raw = await getDeliverySettings(client),
    settings = serializeSettings(raw);
  if (fulfilmentMethod === "STORE_PICKUP")
    return {
      deliveryType: "STORE_PICKUP",
      deliveryZone: "NOT_APPLICABLE",
      distanceKm: null,
      deliveryCharge: 0,
      shippingChargeStatus: "NOT_APPLICABLE",
      sameDayEligible: false,
      sameDayReasonCode: "STORE_PICKUP",
      requiresConfirmation: false,
      message: "Collect your order from The Cellphone Studio.",
    };
  if (!settings.indiaShippingEnabled)
    throw new DeliveryError(
      409,
      "DELIVERY_DISABLED",
      "India-wide delivery is temporarily unavailable.",
    );
  const store = {
      latitude: settings.storeLatitude,
      longitude: settings.storeLongitude,
    },
    destination = {
      latitude: address?.latitude,
      longitude: address?.longitude,
    };
  const distanceKm = haversineDistanceKm(store, destination);
  if (distanceKm == null)
    return {
      deliveryType: "OUTSTATION_CONFIRMATION",
      deliveryZone: "NEEDS_VERIFICATION",
      distanceKm: null,
      deliveryCharge: 0,
      shippingChargeStatus: "PENDING_CONFIRMATION",
      sameDayEligible: false,
      sameDayReasonCode: "ADDRESS_UNVERIFIED",
      requiresConfirmation: true,
      message:
        "Delivery distance and shipping charges will be confirmed by our delivery team by phone.",
    };
  if (distanceKm <= settings.localRadiusKm) {
    const sameDayEligible =
      settings.sameDayEnabled && beforeCutoff(settings.sameDayCutoff, now);
    return {
      deliveryType: "SAME_DAY_LOCAL",
      deliveryZone: "WITHIN_50_KM",
      distanceKm,
      deliveryCharge: settings.localDeliveryCharge,
      shippingChargeStatus: "FIXED",
      sameDayEligible,
      sameDayReasonCode: sameDayEligible
        ? "ELIGIBLE"
        : settings.sameDayEnabled
          ? "AFTER_CUTOFF"
          : "SAME_DAY_DISABLED",
      requiresConfirmation: false,
      message: sameDayEligible
        ? `Same-day delivery is available for a fixed ₹${settings.localDeliveryCharge}.`
        : `Local delivery is available for a fixed ₹${settings.localDeliveryCharge}.`,
    };
  }
  return {
    deliveryType: "OUTSTATION_CONFIRMATION",
    deliveryZone: "BEYOND_50_KM",
    distanceKm,
    deliveryCharge: 0,
    shippingChargeStatus: "PENDING_CONFIRMATION",
    sameDayEligible: false,
    sameDayReasonCode: "OUT_OF_RADIUS",
    requiresConfirmation: true,
    message:
      "Our delivery manager will call to confirm the shipping charge before payment or dispatch.",
  };
}

export async function findSoleDeliveryManager(client = prisma) {
  const managers = await client.user.findMany({
    where: { role: "DELIVERY_MANAGER", status: "ACTIVE" },
    select: { id: true },
    take: 2,
  });
  return managers.length === 1 ? managers[0].id : null;
}
export function initialDeliveryStatus(preview, managerId) {
  if (preview.deliveryZone === "NEEDS_VERIFICATION")
    return "AWAITING_DISTANCE_VERIFICATION";
  if (preview.requiresConfirmation) return "AWAITING_SHIPPING_CONFIRMATION";
  return managerId ? "PACKAGING_PENDING" : "AWAITING_ASSIGNMENT";
}
