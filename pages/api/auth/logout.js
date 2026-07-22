import { cookie, recordEvent, revokeCurrent } from "@/server/auth/sessionAuth";
import { hasSameOrigin } from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  if (!hasSameOrigin(req))
    return res
      .status(403)
      .json({
        success: false,
        error: {
          code: "INVALID_ORIGIN",
          message: "Request origin was rejected.",
        },
      });
  try {
    const auth = await revokeCurrent(req, "LOGOUT");
    if (auth.user)
      await recordEvent(req, {
        userId: auth.user.id,
        email: auth.user.email,
        eventType: "LOGOUT",
      });
  } catch {}
  res.setHeader("Set-Cookie", cookie("", 0));
  return res.json({ success: true, message: "Logout successful" });
}
