import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { changeCustomerStatus } from "@/server/customers/adminCustomerService";
import { ipHash } from "@/server/auth/sessionAuth";
export default async function handler(req, res) {
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  const admin = await authorizeAdminRequest(req, res, { mutation: true });
  if (!admin) return;
  try {
    return res.json({
      success: true,
      data: {
        customer: await changeCustomerStatus(
          String(req.query.identifier),
          req.body,
          admin,
          { ipHash: ipHash(req) },
        ),
      },
    });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      error: {
        code: e.code || "INTERNAL_ERROR",
        message: e.status ? e.message : "Unable to update customer.",
        ...(e.fields ? { fields: e.fields } : {}),
      },
    });
  }
}
