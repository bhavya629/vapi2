import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRate } from "@/server/enquiries/rateLimit";
import {
  cookie,
  ipHash,
  issueSession,
  recordEvent,
} from "@/server/auth/sessionAuth";
import { passwordError } from "@/server/auth/validation";
import {
  allowMethods,
  requireCustomer,
  sendError,
} from "@/server/http/customerApi";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  const authUser = await requireCustomer(req, res);
  if (!authUser) return;
  if (!checkRate(`password:${authUser.id}:${ipHash(req)}`, 5, 60 * 60 * 1000))
    return sendError(
      res,
      429,
      "PASSWORD_CHANGE_RATE_LIMITED",
      "Too many attempts. Please try again later.",
    );
  const allowed = ["currentPassword", "newPassword", "confirmPassword"];
  if (Object.keys(req.body || {}).some((key) => !allowed.includes(key)))
    return sendError(res, 422, "UNKNOWN_FIELD", "Unsupported request field.");
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const fields = {};
  if (typeof currentPassword !== "string" || !currentPassword)
    fields.currentPassword = "Enter your current password.";
  const policy = passwordError(newPassword, {
    name: authUser.name,
    email: authUser.email,
  });
  if (policy) fields.newPassword = policy;
  if (newPassword !== confirmPassword)
    fields.confirmPassword = "Passwords do not match.";
  if (Object.keys(fields).length)
    return res
      .status(422)
      .json({
        success: false,
        error: {
          code: "PASSWORD_POLICY_FAILED",
          message: "Choose a stronger password.",
          fields,
        },
        field: Object.keys(fields)[0],
        message: Object.values(fields)[0],
      });
  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { passwordHistory: { orderBy: { createdAt: "desc" }, take: 3 } },
    });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
      return res
        .status(400)
        .json({
          success: false,
          error: {
            code: "CURRENT_PASSWORD_INVALID",
            message: "The current password is incorrect.",
          },
          field: "currentPassword",
          message: "The current password is incorrect.",
        });
    for (const item of [
      user.passwordHash,
      ...user.passwordHistory.map((entry) => entry.passwordHash),
    ])
      if (await bcrypt.compare(newPassword, item))
        return res
          .status(409)
          .json({
            success: false,
            error: {
              code: "PASSWORD_REUSED",
              message: "Choose a password you have not used recently.",
              fields: {
                newPassword:
                  "Your new password cannot match your current or last three passwords.",
              },
            },
            field: "newPassword",
            message:
              "Your new password cannot match your current or last three passwords.",
          });
    const hash = await bcrypt.hash(newPassword, 12),
      now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash, lastPasswordChangedAt: now },
      }),
      prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash: hash },
      }),
      prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now, revokeReason: "PASSWORD_CHANGED" },
      }),
    ]);
    const fresh = await issueSession(user, req);
    await recordEvent(req, {
      userId: user.id,
      email: user.email,
      eventType: "PASSWORD_CHANGED",
    });
    res.setHeader("Set-Cookie", cookie(fresh.token));
    return res.json({
      success: true,
      message: "Your password was changed and other sessions were signed out.",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return sendError(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to change your password.",
    );
  }
}
