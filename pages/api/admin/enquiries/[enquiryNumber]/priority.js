import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { updatePriority } from "@/server/enquiries/enquiryService";
import { fail } from "@/server/enquiries/enquiryApi";
export default async function handler(req, res) {
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  const admin = await authorizeAdminRequest(req, res, { mutation: true });
  if (!admin) return;
  try {
    return res.json({
      success: true,
      data: {
        enquiry: await updatePriority(
          String(req.query.enquiryNumber),
          req.body?.priority,
          admin,
        ),
      },
    });
  } catch (e) {
    return fail(e, res, "enquiry priority");
  }
}
