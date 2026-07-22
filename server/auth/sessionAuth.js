import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createToken, verifyToken } from "@/lib/auth";
const COOKIE = "auth_token",
  MAX_AGE = 60 * 60 * 24 * 7;
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  lastPasswordChangedAt: true,
};
export function readToken(req) {
  const item = (req.headers.cookie || "")
    .split(";")
    .find((x) => x.trim().startsWith(`${COOKIE}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(item.indexOf("=") + 1).trim());
  } catch {
    return null;
  }
}
export const tokenHash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
export function ipHash(req) {
  const ip = String(
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
  )
    .split(",")[0]
    .trim();
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(ip || "unknown")
    .digest("hex");
}
export function deviceLabel(ua = "") {
  const browser = /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "Browser",
    os = /iPhone|iPad/.test(ua)
      ? "iPhone/iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS/.test(ua)
            ? "Mac"
            : "Device";
  return `${browser} on ${os}`;
}
export function cookie(token, maxAge = MAX_AGE) {
  const parts = [
    `${COOKIE}=${token ? encodeURIComponent(token) : ""}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (!token) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
export async function issueSession(user, req) {
  const jti = crypto.randomBytes(32).toString("base64url"),
    expiresAt = new Date(Date.now() + MAX_AGE * 1000),
    ua = String(req.headers["user-agent"] || "").slice(0, 500);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(jti),
      userAgent: ua || null,
      ipHash: ipHash(req),
      deviceLabel: deviceLabel(ua),
      expiresAt,
    },
  });
  return { token: createToken(user, jti), session };
}
export async function authenticate(req) {
  const raw = readToken(req),
    decoded = verifyToken(raw);
  if (!raw || !decoded?.userId) return { error: "SESSION_INVALID" };
  let session = null;
  if (decoded.jti) {
    session = await prisma.session.findUnique({
      where: { tokenHash: tokenHash(decoded.jti) },
      include: { user: { select: safeUserSelect } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.userId !== decoded.userId
    )
      return { error: "SESSION_INVALID" };
  } else {
    if (process.env.ALLOW_LEGACY_AUTH_TOKENS === "false")
      return { error: "SESSION_INVALID" };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: safeUserSelect,
    });
    if (!user) return { error: "SESSION_INVALID" };
    session = { id: null, user, legacy: true };
  }
  if (session.user.status === "SUSPENDED")
    return { error: "ACCOUNT_SUSPENDED", user: session.user };
  if (session.id && session.lastUsedAt < new Date(Date.now() - 10 * 60 * 1000))
    prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  return { user: session.user, session, decoded };
}
export async function recordEvent(
  req,
  {
    userId = null,
    email = "",
    eventType,
    success = true,
    failureReason = null,
  },
) {
  const ua = String(req.headers["user-agent"] || "").slice(0, 500);
  return prisma.authEvent.create({
    data: {
      userId,
      emailNormalized: String(email).trim().toLowerCase(),
      eventType,
      success,
      failureReason,
      ipHash: ipHash(req),
      userAgent: ua || null,
      deviceLabel: deviceLabel(ua),
    },
  });
}
export async function revokeCurrent(req, reason = "LOGOUT") {
  const auth = await authenticate(req);
  if (auth.session?.id && !auth.session.revokedAt)
    await prisma.session.update({
      where: { id: auth.session.id },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  return auth;
}
