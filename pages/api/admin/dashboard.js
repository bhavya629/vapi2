import { dashboardData } from "@/server/admin/adminCatalogueService";
import { orderStats } from "@/server/orders/adminOrderService";
import { stats as enquiryStats } from "@/server/enquiries/enquiryService";
import { customerStats } from "@/server/customers/adminCustomerService";
import { reviewStats } from "@/server/reviews/reviewService";
import { prisma } from "@/lib/prisma";
import {
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      data,
      orders,
      enquiries,
      customers,
      reviews,
      totalOrders,
      todayOrders,
      revenue,
      bestSelling,
    ] = await Promise.all([
      dashboardData(),
      orderStats(),
      enquiryStats(),
      customerStats(),
      reviewStats(),
      prisma.order.count(),
      prisma.order.count({ where: { placedAt: { gte: today } } }),
      prisma.order.aggregate({
        where: { status: { notIn: ["CANCELLED", "FAILED"] } },
        _sum: { total: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        ...data,
        orders: {
          ...orders,
          total: totalOrders,
          today: todayOrders,
          revenue: Number(revenue._sum.total || 0),
        },
        enquiries,
        customers,
        reviews,
        bestSelling: bestSelling.map((x) => ({
          name: x.productName,
          quantity: x._sum.quantity || 0,
          revenue: Number(x._sum.lineTotal || 0),
        })),
      },
    });
  } catch (e) {
    return handleAdminFailure(e, res, "Admin dashboard error");
  }
}
