import { voteReview } from "@/server/reviews/reviewService";
import { fail } from "@/server/reviews/reviewApi";
import { checkRate } from "@/server/enquiries/rateLimit";
import { allowMethods, requireCustomer } from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  if (!checkRate(`review-vote:${user.id}`, 30, 60 * 60 * 1000))
    return res.status(429).json({
      success: false,
      error: { code: "REVIEW_RATE_LIMITED", message: "Too many votes." },
    });
  try {
    if (Object.keys(req.body || {}).some((key) => key !== "helpful"))
      return res
        .status(422)
        .json({
          success: false,
          error: {
            code: "UNKNOWN_FIELD",
            message: "Unsupported request field.",
          },
        });
    return res.json({
      success: true,
      data: await voteReview(
        user.id,
        String(req.query.id),
        req.body?.helpful !== false,
      ),
    });
  } catch (e) {
    return fail(e, res, "review vote");
  }
}
