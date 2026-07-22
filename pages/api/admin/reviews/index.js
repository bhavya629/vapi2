import { adminReviews } from "@/server/reviews/reviewService";
import { fail } from "@/server/reviews/reviewApi";
import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.json({ success: true, data: await adminReviews(req.query) });
  } catch (e) {
    return fail(e, res, "admin reviews");
  }
}
