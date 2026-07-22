import { listCoupons, saveCoupon } from "@/server/admin/adminContentService";
import {
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method))
    return methodNotAllowed(res, ["GET", "POST"]);
  const admin = await authorizeAdminRequest(req, res, {
    mutation: req.method !== "GET",
  });
  if (!admin) return;
  try {
    const data =
      req.method === "GET"
        ? { coupons: await listCoupons(req.query) }
        : await saveCoupon(null, req.body);
    if (data.fields)
      return res.status(422).json({
        success: false,
        error: {
          message: "Correct the highlighted fields.",
          fields: data.fields,
        },
      });
    return res
      .status(req.method === "POST" ? 201 : 200)
      .json({ success: true, data });
  } catch (e) {
    return handleAdminFailure(e, res, "Coupon admin error");
  }
}
