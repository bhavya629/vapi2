import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { prisma } from "@/lib/prisma";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  const user = await prisma.user.findFirst({
    where: { id: String(req.query.identifier), role: "CUSTOMER" },
    select: { id: true },
  });
  if (!user)
    return res.status(404).json({
      success: false,
      error: { code: "CUSTOMER_NOT_FOUND", message: "Customer not found." },
    });
  const events = await prisma.authEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      eventType: true,
      success: true,
      deviceLabel: true,
      createdAt: true,
    },
  });
  return res.json({ success: true, data: { events } });
}
