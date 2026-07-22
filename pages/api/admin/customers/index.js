import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { listCustomers } from "@/server/customers/adminCustomerService";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.json({ success: true, data: await listCustomers(req.query) });
  } catch (e) {
    console.error("Admin customers:", e);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Unable to load customers." },
    });
  }
}
