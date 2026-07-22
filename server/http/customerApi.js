import { authenticate } from "@/server/auth/sessionAuth";

export function sendError(res, status, code, message, details) {
  return res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods);
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  return false;
}

export function hasSameOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.origin;
  if (!origin) return process.env.NODE_ENV !== "production";
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export async function requireCustomer(req, res) {
  if (Number(req.headers["content-length"] || 0) > 100_000) { sendError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large."); return null; }
  if (!hasSameOrigin(req)) { sendError(res, 403, "INVALID_ORIGIN", "Request origin was rejected."); return null; }
  const auth=await authenticate(req);
  if(auth.error==="ACCOUNT_SUSPENDED"){sendError(res,403,"ACCOUNT_SUSPENDED","This account is currently unavailable. Please contact The Cellphone Studio for assistance.");return null}
  if (!auth.user) { sendError(res, 401, "SESSION_INVALID", "Your session has expired. Please sign in again."); return null; }
  Object.defineProperty(auth.user,"_session",{value:auth.session,enumerable:false});return auth.user;
}
