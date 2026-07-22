import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { adminMessage } from "@/server/enquiries/enquiryService";
import { fail } from "@/server/enquiries/enquiryApi";
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const admin = await authorizeAdminRequest(req, res, { mutation: true });
  if (!admin) return;
  try {
    return res.json({
      success: true,
      data: {
        enquiry: await adminMessage(
          String(req.query.enquiryNumber),
          req.body,
          admin,
        ),
      },
    });
  } catch (e) {
    return fail(e, res, "enquiry message");
  }
}
