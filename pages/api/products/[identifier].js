import { getProduct } from "@/server/catalogue/catalogueService";
import { normalizeType } from "@/server/validation/catalogueValidation";
export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", ["GET"]); return res.status(405).json({ success: false, message: "Method not allowed." }); }
  try { const identifier = String(req.query.identifier || "").trim(); if (!identifier || identifier.length > 150) return res.status(400).json({ success: false, message: "Invalid product identifier." }); const type = normalizeType(req.query.type); if (type.error) return res.status(400).json({ success: false, message: type.error }); const product = await getProduct(identifier, type.value); if (!product) return res.status(404).json({ success: false, message: "Product not found." }); return res.status(200).json({ success: true, data: { product } }); }
  catch (error) { console.error("Product detail API error:", error); return res.status(500).json({ success: false, message: "The product is temporarily unavailable." }); }
}
