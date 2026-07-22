import { prisma } from "@/lib/prisma";

export class AddressError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
const text = (v, max = 120) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const INDIA_STATES = new Set([
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]);
export function validateAddress(input = {}) {
  const latitude =
      input.latitude === "" || input.latitude == null
        ? null
        : Number(input.latitude),
    longitude =
      input.longitude === "" || input.longitude == null
        ? null
        : Number(input.longitude);
  const addressType = ["HOME", "WORK", "OTHER"].includes(
    String(input.addressType || "").toUpperCase(),
  )
    ? String(input.addressType).toUpperCase()
    : "HOME";
  const value = {
    label: text(input.label, 30) || "Home",
    recipientName: text(input.recipientName, 80),
    phone: text(input.phone, 20).replace(/\s/g, ""),
    alternatePhone: text(input.alternatePhone, 20) || null,
    addressLine1: text(input.addressLine1, 160),
    addressLine2: text(input.addressLine2, 160) || null,
    landmark: text(input.landmark, 100) || null,
    city: text(input.city, 60),
    district: text(input.district, 60) || null,
    state: text(input.state, 60),
    postalCode: text(input.postalCode, 10),
    country: "India",
    addressType,
    latitude,
    longitude,
    isDefault: Boolean(input.isDefault),
  };
  const missing = [
    "recipientName",
    "phone",
    "addressLine1",
    "city",
    "state",
    "postalCode",
  ].filter((k) => !value[k]);
  if (missing.length)
    throw new AddressError(
      422,
      "VALIDATION_ERROR",
      "Required address fields are missing.",
      { fields: missing },
    );
  if (!/^(?:\+91)?[6-9]\d{9}$/.test(value.phone.replace(/[- ]/g, "")))
    throw new AddressError(
      422,
      "INVALID_PHONE",
      "Enter a valid Indian mobile number.",
    );
  if (!/^\d{6}$/.test(value.postalCode))
    throw new AddressError(
      422,
      "INVALID_POSTAL_CODE",
      "Enter a valid 6-digit postal code.",
    );
  if (!INDIA_STATES.has(value.state))
    throw new AddressError(
      422,
      "INVALID_STATE",
      "Select a valid Indian state or union territory.",
    );
  if (
    (latitude != null &&
      (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude != null &&
      (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
  )
    throw new AddressError(
      422,
      "INVALID_COORDINATES",
      "Address coordinates are invalid.",
    );
  if ((latitude == null) !== (longitude == null))
    throw new AddressError(
      422,
      "INCOMPLETE_COORDINATES",
      "Both latitude and longitude are required together.",
    );
  return value;
}
export const listAddresses = (userId) =>
  prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
export async function createAddress(userId, input, client = prisma) {
  const data = validateAddress(input);
  return client.$transaction
    ? client.$transaction(async (tx) => {
        const count = await tx.address.count({ where: { userId } });
        const makeDefault = data.isDefault || count === 0;
        if (makeDefault)
          await tx.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        return tx.address.create({
          data: { ...data, isDefault: makeDefault, userId },
        });
      })
    : client.address.create({ data: { ...data, userId } });
}
export async function getOwnedAddress(userId, id, client = prisma) {
  const found = await client.address.findFirst({ where: { id, userId } });
  if (!found)
    throw new AddressError(404, "ADDRESS_NOT_FOUND", "Address not found.");
  return found;
}
export async function updateAddress(userId, id, input) {
  const data = validateAddress(input);
  return prisma.$transaction(async (tx) => {
    await getOwnedAddress(userId, id, tx);
    if (data.isDefault)
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    return tx.address.update({ where: { id }, data });
  });
}
export async function setDefaultAddress(userId, id) {
  return prisma.$transaction(async (tx) => {
    await getOwnedAddress(userId, id, tx);
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    return tx.address.update({ where: { id }, data: { isDefault: true } });
  });
}
export async function deleteAddress(userId, id) {
  return prisma.$transaction(async (tx) => {
    const target = await getOwnedAddress(userId, id, tx);
    await tx.address.delete({ where: { id } });
    if (target.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (next)
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
    }
  });
}
