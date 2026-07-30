import { prisma } from "@/lib/prisma";
import { checkRate } from "@/server/enquiries/rateLimit";
import { ipHash, recordEvent, safeUserSelect } from "@/server/auth/sessionAuth";
import {
  allowMethods,
  requireCustomer,
  sendError,
} from "@/server/http/customerApi";
const dto = (u) => ({
  ...u,
  emailVerified: false,
  phoneVerified: false,
  counts: {
    orders: u._count.orders,
    wishlistItems: u._count.wishlistItems,
    enquiries: u._count.enquiries,
    savedAddresses: u._count.addresses,
  },
  defaultAddress: u.addresses[0] || null,
  _count: undefined,
  addresses: undefined,
});
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "PATCH"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  try {
    if (req.method === "GET") {
      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          ...safeUserSelect,
          _count: {
            select: {
              orders: true,
              wishlistItems: true,
              enquiries: true,
              addresses: true,
            },
          },
          addresses: {
            where: { isDefault: true },
            select: { label: true, city: true, state: true, postalCode: true },
            take: 1,
          },
        },
      });
      return res.json({
        success: true,
        data: { profile: dto(row) },
        user: dto(row),
      });
    }
    if (!checkRate(`profile:${user.id}:${ipHash(req)}`, 20, 60 * 60 * 1000))
      return sendError(
        res,
        429,
        "PROFILE_RATE_LIMITED",
        "Too many profile updates. Please try again later.",
      );
    const allowed = ["name", "phone"];
    if (Object.keys(req.body || {}).some((k) => !allowed.includes(k)))
      return sendError(
        res,
        422,
        "UNKNOWN_FIELD",
        "Only name and phone can be updated.",
      );
    const name = String(req.body?.name || "")
        .trim()
        .replace(/\s+/g, " "),
      phone = String(req.body?.phone || "").trim();
    const fields = {};
    if (name.length < 2 || name.length > 100)
      fields.name = "Full name must be between 2 and 100 characters.";
    if (!/^[6-9]\d{9}$/.test(phone))
      fields.phone = "Enter a valid 10-digit Indian mobile number.";
    if (Object.keys(fields).length)
      return res
        .status(422)
        .json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields.",
            fields,
          },
          field: Object.keys(fields)[0],
          message: Object.values(fields)[0],
        });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name, phone },
      select: safeUserSelect,
    });
    await recordEvent(req, {
      userId: user.id,
      email: user.email,
      eventType: "PROFILE_UPDATED",
    });
    return res.json({
      success: true,
      data: { profile: updated },
      user: updated,
    });
  } catch (error) {
    if (error?.code === "P2002")
      return sendError(
        res,
        409,
        "MOBILE_ALREADY_REGISTERED",
        "This mobile number is already registered. Please login instead.",
      );
    console.error("Profile API error:", error);
    return sendError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to update your profile.",
    );
  }
}
