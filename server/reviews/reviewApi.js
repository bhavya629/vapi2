import { ReviewError } from "@/server/reviews/reviewService";
export function fail(error, res, label) {
  if (error instanceof ReviewError)
    return res
      .status(error.status)
      .json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      });
  console.error(label, error);
  return res
    .status(500)
    .json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to complete the review request.",
      },
    });
}
