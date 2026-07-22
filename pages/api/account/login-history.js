import { prisma } from "@/lib/prisma";
import { allowMethods, requireCustomer } from "@/server/http/customerApi";
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireCustomer(req, res);
  if (!user) return;
  const rows = await prisma.authEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      eventType: true,
      success: true,
      deviceLabel: true,
      createdAt: true,
    },
  });
  return res.json({
    success: true,
    data: {
      events: rows.map((x) => ({
        ...x,
        label:
          x.eventType === "LOGIN_FAILURE"
            ? "Unsuccessful login attempt"
            : x.eventType
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/^./, (c) => c.toUpperCase()),
        deviceLabel: x.deviceLabel || "Unknown Device",
      })),
    },
  });
}
