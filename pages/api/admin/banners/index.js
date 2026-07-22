import { listBanners, saveBanner } from "@/server/admin/adminContentService";
import {
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method))
    return methodNotAllowed(res, ["GET", "POST"]);
  if (
    !(await authorizeAdminRequest(req, res, { mutation: req.method !== "GET" }))
  )
    return;
  try {
    const data =
      req.method === "GET"
        ? { banners: await listBanners() }
        : await saveBanner(null, req.body);
    if (data.fields)
      return res.status(422).json({
        success: false,
        error: {
          message: "Correct the highlighted fields.",
          fields: data.fields,
        },
      });
    return res
      .status(req.method === "POST" ? 201 : 200)
      .json({ success: true, data });
  } catch (e) {
    return handleAdminFailure(e, res, "Banner admin error");
  }
}
