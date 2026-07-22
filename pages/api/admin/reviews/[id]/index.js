import {
  adminDelete,
  adminDetail,
  moderate,
} from "@/server/reviews/reviewService";
import { fail } from "@/server/reviews/reviewApi";
import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (!["GET", "PATCH", "DELETE"].includes(req.method))
    return methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  const admin = await authorizeAdminRequest(req, res, {
    mutation: req.method !== "GET",
  });
  if (!admin) return;
  try {
    if (req.method === "GET")
      return res.json({
        success: true,
        data: { review: await adminDetail(String(req.query.id)) },
      });
    if (req.method === "DELETE")
      return res.json({
        success: true,
        data: await adminDelete(String(req.query.id), admin.id),
      });
    return res.json({
      success: true,
      data: {
        review: await moderate(String(req.query.id), req.body, admin.id),
      },
    });
  } catch (e) {
    return fail(e, res, "admin review");
  }
}
