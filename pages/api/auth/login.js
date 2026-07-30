import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRate } from "@/server/enquiries/rateLimit";
import { cookie, ipHash, issueSession, recordEvent } from "@/server/auth/sessionAuth";
import { hasSameOrigin } from "@/server/http/customerApi";

const dummy = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOe7S4nZ0n8aOfMOBtQ9KMy7ZgqS6jY1a";
const fail = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message }, message });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return fail(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  if (!hasSameOrigin(req))
    return fail(res, 403, "INVALID_ORIGIN", "Request origin was rejected.");
  if (Number(req.headers["content-length"] || 0) > 10000)
    return fail(res, 413, "PAYLOAD_TOO_LARGE", "Request is too large.");

  const allowed = ["phone", "password"];
  if (Object.keys(req.body || {}).some((key) => !allowed.includes(key)))
    return fail(res, 422, "UNKNOWN_FIELD", "Unsupported request field.");

  const phone = String(req.body?.phone || "").trim();
  const password = String(req.body?.password || "");
  const rateKey = `login:${ipHash(req)}:${phone}`;
  if (!checkRate(rateKey, 10))
    return fail(res, 429, "LOGIN_RATE_LIMITED", "Too many login attempts. Please try again later.");
  if (!/^[6-9]\d{9}$/.test(phone) || !password)
    return fail(res, 400, "INVALID_CREDENTIALS", "Invalid mobile number or password.");

  try {
    const user = await prisma.user.findUnique({ where: { phone } });
    const matches = await bcrypt.compare(password, user?.passwordHash || dummy);
    if (user?.status === "SUSPENDED")
      return fail(res, 403, "ACCOUNT_SUSPENDED", "This account is currently unavailable. Please contact The Cellphone Studio for assistance.");
    if (user?.lockedUntil && user.lockedUntil > new Date())
      return fail(res, 423, "ACCOUNT_LOCKED", "Too many unsuccessful attempts. Please try again later.");
    if (!user || !matches) {
      if (user) {
        const recent =
            user.lastFailedLoginAt &&
            user.lastFailedLoginAt > new Date(Date.now() - 15 * 60 * 1000),
          count = (recent ? user.failedLoginCount : 0) + 1,
          locked = count >= 5;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: locked ? 0 : count,
            lastFailedLoginAt: new Date(),
            lockedUntil: locked ? new Date(Date.now() + 15 * 60 * 1000) : null,
            status: locked ? "LOCKED" : user.status,
          },
        });
      }
      await recordEvent(req, {
        userId: user?.id,
        email: phone,
        eventType: "LOGIN_FAILURE",
        success: false,
        failureReason: "INVALID_CREDENTIALS",
      });
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid mobile number or password.");
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        failedLoginCount: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        status: user.status === "LOCKED" ? "ACTIVE" : user.status,
      },
    });
    const fresh = {
      ...user,
      status: user.status === "LOCKED" ? "ACTIVE" : user.status,
      lastLoginAt: now,
    };
    const session = await issueSession(fresh, req);
    await recordEvent(req, { userId: user.id, email: phone, eventType: "LOGIN_SUCCESS" });
    res.setHeader("Set-Cookie", cookie(session.token));
    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: fresh.id,
        name: fresh.name,
        phone: fresh.phone,
        role: fresh.role,
        status: fresh.status,
        createdAt: fresh.createdAt,
        lastLoginAt: now,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Unable to sign in.");
  }
}
