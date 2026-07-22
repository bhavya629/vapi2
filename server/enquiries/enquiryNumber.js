import crypto from "crypto";

export function generateEnquiryNumber(now = new Date()) {
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `TCS-ENQ-${date}-${suffix}`;
}
