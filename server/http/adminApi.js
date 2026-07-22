import { requireAdmin } from "@/server/auth/adminAuth";

export function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods);
  return res
    .status(405)
    .json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." },
    });
}
export function adminError(res, status, code, message, fields) {
  return res
    .status(status)
    .json({
      success: false,
      error: { code, message, ...(fields ? { fields } : {}) },
    });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export async function authorizeAdminRequest(
  req,
  res,
  { mutation = false, maxBodySize = 100_000 } = {},
) {
  if (Number(req.headers["content-length"] || 0) > maxBodySize) {
    adminError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    return null;
  }
  if (mutation && !sameOrigin(req)) {
    adminError(
      res,
      403,
      "ORIGIN_REJECTED",
      "The request origin is not allowed.",
    );
    return null;
  }
  const auth = await requireAdmin(req);
  if (auth.error) {
    adminError(res, auth.status, auth.error.code, auth.error.message);
    return null;
  }
  return auth.user;
}

export function handleAdminFailure(error, res, label) {
  if (error?.code === "P2002")
    return adminError(
      res,
      409,
      "DUPLICATE_VALUE",
      "A record with that slug, name, or SKU already exists.",
    );
  if (error?.code === "P2025")
    return adminError(
      res,
      404,
      "NOT_FOUND",
      "The requested record was not found.",
    );
  console.error(`${label}:`, error);
  return adminError(
    res,
    500,
    "INTERNAL_ERROR",
    "The request could not be completed.",
  );
}
