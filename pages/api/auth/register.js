import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRate } from "@/server/enquiries/rateLimit";
import { cookie, ipHash, issueSession, recordEvent } from "@/server/auth/sessionAuth";
import { hasSameOrigin } from "@/server/http/customerApi";
import { passwordError } from "@/server/auth/validation";

const DUPLICATE_MOBILE_MESSAGE =
  "This mobile number is already registered. Please login instead.";
const fail = (res, status, code, message, fields) =>
  res.status(status).json({
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
    return fail(res, 429, "SIGNUP_RATE_LIMITED", "Too many signup attempts. Please try again later.");

  const allowed = ["name", "phone", "password"];
  if (Object.keys(req.body || {}).some((key) => !allowed.includes(key)))
    return fail(res, 422, "UNKNOWN_FIELD", "Unsupported request field.");

  const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
  const phone = String(req.body?.phone || "").trim();
  const password = String(req.body?.password || "");
  const fields = {};
  if (name.length < 2)
    fields.name = "Full name must contain at least 2 characters.";
  if (!/^[6-9]\d{9}$/.test(phone))
    fields.phone = "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.";
  const passwordValidation = passwordError(password);
  if (passwordValidation) fields.password = passwordValidation;
  if (Object.keys(fields).length)
    return fail(res, 422, "VALIDATION_ERROR", "Please correct the highlighted fields.", fields);

  try {
    if (await prisma.user.findUnique({ where: { phone }, select: { id: true } }))
      return fail(res, 409, "MOBILE_ALREADY_REGISTERED", DUPLICATE_MOBILE_MESSAGE);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        passwordHistory: { create: { passwordHash } },
      },
    });
    const session = await issueSession(user, req);
    await recordEvent(req, {
      userId: user.id,
      email: phone,
      eventType: "LOGIN_SUCCESS",
    });
    res.setHeader("Set-Cookie", cookie(session.token));
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    const target = Array.isArray(error?.meta?.target)
      ? error.meta.target
      : [error?.meta?.target];
    if (error?.code === "P2002" && target.some((value) => String(value).includes("phone")))
      return fail(res, 409, "MOBILE_ALREADY_REGISTERED", DUPLICATE_MOBILE_MESSAGE);
    console.error("Register API error:", error);
    return fail(res, 500, "INTERNAL_ERROR", "Unable to create account.");
  }
}
