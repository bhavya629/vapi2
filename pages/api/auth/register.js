import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRate } from "@/server/enquiries/rateLimit";
import {
  cookie,
  ipHash,
  issueSession,
  recordEvent,
} from "@/server/auth/sessionAuth";
import { hasSameOrigin } from "@/server/http/customerApi";
import { passwordError } from "@/server/auth/validation";
const fail = (res, status, code, message, fields) =>
  res
    .status(status)
    .json({
      success: false,
      error: { code, message, ...(fields ? { fields } : {}) },
      message,
    });
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return fail(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  if (!hasSameOrigin(req))
    return fail(res, 403, "INVALID_ORIGIN", "Request origin was rejected.");
  if (!checkRate(`signup:${ipHash(req)}`, 5, 60 * 60 * 1000))
    return fail(
      res,
      429,
      "SIGNUP_RATE_LIMITED",
      "Too many signup attempts. Please try again later.",
    );
  const allowed = ["name", "email", "phone", "password"];
  if (Object.keys(req.body || {}).some((k) => !allowed.includes(k)))
    return fail(res, 422, "UNKNOWN_FIELD", "Unsupported request field.");
  const name = String(req.body?.name || "")
      .trim()
      .replace(/\s+/g, " "),
    email = String(req.body?.email || "")
      .trim()
      .toLowerCase(),
    phone = String(req.body?.phone || "")
      .replace(/^(\+91|91)/, "")
      .replace(/\D/g, ""),
    password = String(req.body?.password || "");
  const fields = {};
  if (name.length < 2 || name.length > 100)
    fields.name = "Name must contain 2–100 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fields.email = "Enter a valid email address.";
  if (phone && !/^[6-9]\d{9}$/.test(phone))
    fields.phone = "Enter a valid Indian mobile number.";
  const p = passwordError(password, { name, email });
  if (p) fields.password = p;
  if (Object.keys(fields).length)
    return fail(
      res,
      422,
      "VALIDATION_ERROR",
      "Please correct the highlighted fields.",
      fields,
    );
  try {
    if (
      await prisma.user.findUnique({ where: { email }, select: { id: true } })
    )
      return fail(
        res,
        409,
        "ACCOUNT_EXISTS",
        "An account already exists with this email.",
      );
    const hash = await bcrypt.hash(password, 12),
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          passwordHash: hash,
          passwordHistory: { create: { passwordHash: hash } },
        },
      }),
      session = await issueSession(user, req);
    await recordEvent(req, {
      userId: user.id,
      email,
      eventType: "LOGIN_SUCCESS",
    });
    res.setHeader("Set-Cookie", cookie(session.token));
    return res
      .status(201)
      .json({
        success: true,
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
      });
  } catch (error) {
    console.error("Register API error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Unable to create account.");
  }
}
