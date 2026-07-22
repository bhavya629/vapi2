import crypto from "crypto";
import { getAuthenticatedUser } from "@/server/auth/adminAuth";
import { createEnquiry } from "@/server/enquiries/enquiryService";
import { checkRate } from "@/server/enquiries/rateLimit";
import { fail } from "@/server/enquiries/enquiryApi";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({
        success: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." },
      });
  }
  if (Number(req.headers["content-length"] || 0) > 20000)
    return res
      .status(413)
      .json({
        success: false,
        error: { code: "PAYLOAD_TOO_LARGE", message: "Request is too large." },
      });
  const origin = req.headers.origin;
  let originHost = "";
  try { originHost = origin ? new URL(origin).host : ""; } catch { originHost = ""; }
  if (!originHost || originHost !== req.headers.host)
    return res
      .status(403)
      .json({
        success: false,
        error: {
          code: "ORIGIN_REJECTED",
          message: "Request origin was rejected.",
        },
      });
  const user = await getAuthenticatedUser(req),
    ip = String(
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    ).split(",")[0],
    key = crypto
      .createHash("sha256")
      .update(`${ip}|${String(req.body?.email || "").toLowerCase()}`)
      .digest("hex");
  if (!checkRate(`${user?.id || "guest"}:${key}`, user ? 10 : 5))
    return res
      .status(429)
      .json({
        success: false,
        error: {
          code: "ENQUIRY_RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      });
  try {
    const allowed = [
      "name",
      "email",
      "phone",
      "subject",
      "category",
      "message",
      "orderNumber",
      "website",
    ];
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
      .json({ success: true, data: await createEnquiry(user, req.body) });
  } catch (e) {
    return fail(e, res, "contact enquiry");
  }
}
