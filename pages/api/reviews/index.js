import { createReview } from "@/server/reviews/reviewService";
import { fail } from "@/server/reviews/reviewApi";
import { checkRate } from "@/server/enquiries/rateLimit";
import { allowMethods, requireCustomer } from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  if (!checkRate(`review-create:${user.id}`, 5, 60 * 60 * 1000))
    return res
      .status(429)
      .json({
        success: false,
        error: {
          code: "REVIEW_RATE_LIMITED",
          message: "Too many review attempts.",
        },
      });
  try {
    const allowed = ["productId", "rating", "title", "comment"];
    if (Object.keys(req.body || {}).some((k) => !allowed.includes(k)))
      return res
        .status(422)
        .json({
          success: false,
          error: {
            code: "UNKNOWN_FIELD",
            message: "Unsupported request field.",
          },
        });
    return res
      .status(201)
      .json({
        success: true,
        data: { review: await createReview(user.id, req.body) },
      });
  } catch (e) {
    return fail(e, res, "create review");
  }
}
