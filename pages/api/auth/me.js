import { authenticate } from "@/server/auth/sessionAuth";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  const auth = await authenticate(req);
  if (auth.error === "ACCOUNT_SUSPENDED")
    return res.status(403).json({
      success: false,
      error: {
        code: auth.error,
        message:
          "This account is currently unavailable. Please contact the store.",
      },
    });
  if (!auth.user)
    return res.status(401).json({
      success: false,
      error: {
        code: "SESSION_INVALID",
        message: "Your session has expired. Please sign in again.",
      },
    });
  const { id, name, email, role, status } = auth.user;
  return res.json({ success: true, user: { id, name, email, role, status } });
}
