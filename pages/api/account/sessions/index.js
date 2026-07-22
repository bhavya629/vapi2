import { prisma } from "@/lib/prisma";
import { authenticate, recordEvent } from "@/server/auth/sessionAuth";
import { checkRate } from "@/server/enquiries/rateLimit";
import {
  allowMethods,
  requireCustomer,
  sendError,
} from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "DELETE"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  const auth = await authenticate(req);
  if (req.method === "GET") {
    const rows = await prisma.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
    });
    return res.json({
      success: true,
      data: {
        sessions: rows
          .map((s) => ({
            sessionId: s.id,
            deviceLabel: s.deviceLabel || "Unknown Device",
            lastUsedAt: s.lastUsedAt,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            isCurrent: s.id === auth.session?.id,
          }))
          .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent)),
      },
    });
  }
  if (!checkRate(`sessions:${user.id}`, 20, 60 * 60 * 1000))
    return sendError(
      res,
      429,
      "SESSION_RATE_LIMITED",
      "Too many session requests.",
    );
  const result = await prisma.session.updateMany({
    where: {
      userId: user.id,
      revokedAt: null,
      ...(auth.session?.id ? { id: { not: auth.session.id } } : {}),
    },
    data: {
      revokedAt: new Date(),
      revokeReason: "USER_REVOKED_OTHER_SESSIONS",
    },
  });
  await recordEvent(req, {
    userId: user.id,
    email: user.email,
    eventType: "SESSION_REVOKED",
  });
  return res.json({ success: true, data: { revokedCount: result.count } });
}
