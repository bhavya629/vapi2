import { adjustInventory } from "@/server/admin/adminCatalogueService";
import { adjustVariantInventory } from "@/server/admin/variantAdminService";
import {
  adminError,
  authorizeAdminRequest,
  handleAdminFailure,
  methodNotAllowed,
} from "@/server/http/adminApi";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const admin = await authorizeAdminRequest(req, res, { mutation: true });
  if (!admin) return;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const result = req.body?.variantColourId
        ? await adjustVariantInventory(req.body, admin)
        : await adjustInventory(req.body, admin);
      if (!result)
        return adminError(res, 404, "NOT_FOUND", "Product not found.");
      if (result.fields)
        return adminError(
          res,
          400,
          "VALIDATION_ERROR",
          "Please correct the highlighted fields.",
          result.fields,
        );
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      if (error?.code === "P2034" && attempt < 7) {
        await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)));
        continue;
      }
      return handleAdminFailure(error, res, "Inventory adjustment error");
    }
  }
}
