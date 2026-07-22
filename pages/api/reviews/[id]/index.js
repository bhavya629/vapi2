import { deleteOwn, updateOwn } from "@/server/reviews/reviewService";
import { fail } from "@/server/reviews/reviewApi";
import { checkRate } from "@/server/enquiries/rateLimit";
import { allowMethods, requireCustomer } from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["PATCH", "DELETE"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  if (!checkRate(`review-mutate:${user.id}`, 15, 60 * 60 * 1000))
    return res
      .status(429)
      .json({
        success: false,
        error: {
          code: "REVIEW_RATE_LIMITED",
          message: "Too many review requests.",
        },
      });
  try {
    if (req.method === "DELETE")
      return res.json({
        success: true,
        data: await deleteOwn(user.id, String(req.query.id)),
      });
    const allowed = ["rating", "title", "comment"];
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
    return res.json({
      success: true,
      data: {
        review: await updateOwn(user.id, String(req.query.id), req.body),
      },
    });
  } catch (e) {
    return fail(e, res, "review mutation");
  }
}
