import { deleteBanner, saveBanner } from "@/server/admin/adminContentService";
import {
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (!["PATCH", "DELETE"].includes(req.method))
    return methodNotAllowed(res, ["PATCH", "DELETE"]);
  if (!(await authorizeAdminRequest(req, res, { mutation: true }))) return;
  try {
    const data =
      req.method === "DELETE"
        ? { deleted: Boolean(await deleteBanner(String(req.query.id))) }
        : await saveBanner(String(req.query.id), req.body);
    if (data.fields)
      return res.status(422).json({
        success: false,
        error: {
          message: "Correct the highlighted fields.",
          fields: data.fields,
        },
      });
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return handleAdminFailure(e, res, "Banner admin error");
  }
}
