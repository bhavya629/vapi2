import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { customerDetail } from "@/server/customers/adminCustomerService";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.json({
      success: true,
      data: { customer: await customerDetail(String(req.query.identifier)) },
    });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      error: {
        code: e.code || "INTERNAL_ERROR",
        message: e.status ? e.message : "Unable to load customer.",
      },
    });
  }
}
