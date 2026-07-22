import { ownReviews } from "@/server/reviews/reviewService";
import { fail } from "@/server/reviews/reviewApi";
import { allowMethods, requireCustomer } from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  try {
    return res.json({
      success: true,
      data: await ownReviews(user.id, req.query),
    });
  } catch (e) {
    return fail(e, res, "own reviews");
  }
}
