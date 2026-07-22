import { getSettings, saveSettings } from "@/server/admin/adminContentService";
import {
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";
export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method))
    return methodNotAllowed(res, ["GET", "PATCH"]);
  if (
    !(await authorizeAdminRequest(req, res, {
      mutation: req.method === "PATCH",
    }))
  )
    return;
  try {
    const data =
      req.method === "GET"
        ? { settings: await getSettings() }
        : await saveSettings(req.body);
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
    return handleAdminFailure(e, res, "Settings admin error");
  }
}
