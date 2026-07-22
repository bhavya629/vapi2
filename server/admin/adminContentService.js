import { prisma } from "@/lib/prisma";

const text = (value, max = 250) =>
  String(value || "")
    .trim()
    .slice(0, max);
const url = (value) => {
  const v = text(value, 500);
  return !v || /^(\/|https:\/\/)/i.test(v) ? v || null : undefined;
};
const date = (value) => (value ? new Date(value) : null);
const number = (value) =>
  value === "" || value == null ? null : Number(value);

function couponData(body) {
  const fields = {},
    code = text(body.code, 40).toUpperCase(),
    type = body.type,
    value = number(body.value),
    startsAt = date(body.startsAt),
    expiresAt = date(body.expiresAt);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code))
    fields.code = "Use 3–40 letters, numbers, hyphens, or underscores.";
  if (!["PERCENTAGE", "FIXED"].includes(type))
    fields.type = "Select a discount type.";
  if (!(value > 0) || (type === "PERCENTAGE" && value > 100))
    fields.value = "Enter a valid discount value.";
  if (!startsAt || Number.isNaN(startsAt.getTime()))
    fields.startsAt = "Choose a valid start date.";
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt)
    fields.expiresAt = "Expiry must be after the start date.";
  const usageLimit = number(body.usageLimit);
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1))
    fields.usageLimit = "Enter a positive usage limit.";
  return Object.keys(fields).length
    ? { fields }
    : {
        data: {
          code,
          description: text(body.description, 500) || null,
          type,
          value,
          minimumOrder: number(body.minimumOrder),
          maximumDiscount: number(body.maximumDiscount),
          usageLimit,
          startsAt,
          expiresAt,
          isActive: body.isActive !== false,
        },
      };
}
export async function listCoupons(q = {}) {
  const search = text(q.search, 80);
  const rows = await prisma.coupon.findMany({
    where: search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((x) => ({
    ...x,
    value: Number(x.value),
    minimumOrder: x.minimumOrder == null ? null : Number(x.minimumOrder),
    maximumDiscount:
      x.maximumDiscount == null ? null : Number(x.maximumDiscount),
  }));
}
export async function saveCoupon(id, body) {
  const checked = couponData(body);
  if (checked.fields) return checked;
  const coupon = id
    ? await prisma.coupon.update({ where: { id }, data: checked.data })
    : await prisma.coupon.create({ data: checked.data });
  return { coupon };
}
export async function deleteCoupon(id) {
  return prisma.coupon.delete({ where: { id } });
}

function bannerData(body) {
  const fields = {},
    imageUrl = url(body.imageUrl),
    mobileImageUrl = url(body.mobileImageUrl),
    linkUrl = url(body.linkUrl);
  if (!text(body.title, 120)) fields.title = "Title is required.";
  if (imageUrl === undefined || !imageUrl)
    fields.imageUrl = "Use a local or HTTPS image URL.";
  if (mobileImageUrl === undefined)
    fields.mobileImageUrl = "Use a local or HTTPS image URL.";
  if (linkUrl === undefined) fields.linkUrl = "Use a local or HTTPS link.";
  return Object.keys(fields).length
    ? { fields }
    : {
        data: {
          title: text(body.title, 120),
          subtitle: text(body.subtitle, 300) || null,
          imageUrl,
          mobileImageUrl,
          linkUrl,
          buttonLabel: text(body.buttonLabel, 60) || null,
          isActive: body.isActive !== false,
          displayOrder: Math.max(0, parseInt(body.displayOrder, 10) || 0),
          startsAt: date(body.startsAt),
          endsAt: date(body.endsAt),
        },
      };
}
export async function listBanners() {
  return prisma.banner.findMany({
    orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
  });
}
export async function saveBanner(id, body) {
  const checked = bannerData(body);
  if (checked.fields) return checked;
  const banner = id
    ? await prisma.banner.update({ where: { id }, data: checked.data })
    : await prisma.banner.create({ data: checked.data });
  return { banner };
}
export async function deleteBanner(id) {
  return prisma.banner.delete({ where: { id } });
}

export async function getSettings() {
  return prisma.storeSettings.upsert({
    where: { id: "default" },
    create: {},
    update: {},
  });
}
export async function saveSettings(body) {
  const fields = {},
    email = text(body.email, 150),
    phone = text(body.phone, 30);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fields.email = "Enter a valid email.";
  const urls = {
    logoUrl: url(body.logoUrl),
    facebookUrl: url(body.facebookUrl),
    instagramUrl: url(body.instagramUrl),
    youtubeUrl: url(body.youtubeUrl),
  };
  for (const [k, v] of Object.entries(urls))
    if (v === undefined) fields[k] = "Use a local or HTTPS URL.";
  if (Object.keys(fields).length) return { fields };
  const settings = await prisma.storeSettings.upsert({
    where: { id: "default" },
    create: {
      storeName: text(body.storeName, 120) || "The Cellphone Studio",
      email: email || null,
      phone: phone || null,
      whatsapp: text(body.whatsapp, 30) || null,
      address: text(body.address, 500) || null,
      ...urls,
    },
    update: {
      storeName: text(body.storeName, 120) || "The Cellphone Studio",
      email: email || null,
      phone: phone || null,
      whatsapp: text(body.whatsapp, 30) || null,
      address: text(body.address, 500) || null,
      ...urls,
    },
  });
  return { settings };
}
