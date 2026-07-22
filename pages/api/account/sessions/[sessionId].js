import { prisma } from "@/lib/prisma";
import { authenticate, cookie, recordEvent } from "@/server/auth/sessionAuth";
import { checkRate } from "@/server/enquiries/rateLimit";
import {
  allowMethods,
  requireCustomer,
  sendError,
} from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["DELETE"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  if (!checkRate(`session-revoke:${user.id}`, 20, 60 * 60 * 1000))
    return sendError(
      res,
      429,
      "SESSION_RATE_LIMITED",
      "Too many session requests.",
    );
  const auth = await authenticate(req),
    target = await prisma.session.findFirst({
      where: { id: String(req.query.sessionId), userId: user.id },
    });
  if (!target)
    return sendError(res, 404, "SESSION_NOT_FOUND", "Session not found.");
  if (!target.revokedAt)
    await prisma.session.update({
      where: { id: target.id },
      data: { revokedAt: new Date(), revokeReason: "USER_REVOKED" },
    });
  await recordEvent(req, {
    userId: user.id,
    email: user.email,
    eventType: "SESSION_REVOKED",
  });
  const current = target.id === auth.session?.id;
  if (current) res.setHeader("Set-Cookie", cookie("", 0));
  return res.json({
    success: true,
    data: { revoked: true, currentSession: current },
  });
}
