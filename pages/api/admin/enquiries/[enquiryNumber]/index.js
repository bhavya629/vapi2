import {
  authorizeAdminRequest,
  methodNotAllowed,
} from "@/server/http/adminApi";
import { adminDetail } from "@/server/enquiries/enquiryService";
import { fail } from "@/server/enquiries/enquiryApi";
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!(await authorizeAdminRequest(req, res))) return;
  try {
    return res.json({
      success: true,
      data: { enquiry: await adminDetail(String(req.query.enquiryNumber)) },
    });
  } catch (e) {
    return fail(e, res, "admin enquiry");
  }
}
