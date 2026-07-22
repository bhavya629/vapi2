import { getAuthenticatedUser } from "@/server/auth/adminAuth";
import { productReviews } from "@/server/reviews/reviewService";
import { fail } from "@/server/reviews/reviewApi";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({
        success: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." },
      });
  }
  try {
    const user = await getAuthenticatedUser(req);
    return res.json({
      success: true,
      data: await productReviews(
        String(req.query.productId),
        req.query,
        user?.id,
      ),
    });
  } catch (e) {
    return fail(e, res, "product reviews");
  }
}
