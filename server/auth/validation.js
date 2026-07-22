const weak = new Set([
  "password123!",
  "qwerty123!",
  "welcome123!",
  "admin12345!",
]);
export function passwordError(value, { name = "", email = "" } = {}) {
  if (
    typeof value !== "string" ||
    value.length < 10 ||
    value.length > 128 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[\W_]/.test(value)
  )
    return "Use 10–128 characters with uppercase, lowercase, number and symbol.";
  if (value !== value.trim())
    return "Password cannot begin or end with whitespace.";
  if (weak.has(value.toLowerCase())) return "Choose a less common password.";
  const lower = value.toLowerCase(),
    emailName = email.split("@")[0]?.toLowerCase(),
    plainName = name.toLowerCase().replace(/\s+/g, "");
  if (
    (emailName?.length >= 4 && lower.includes(emailName)) ||
    (plainName.length >= 4 && lower.includes(plainName))
  )
    return "Password must not contain your name or email.";
  return null;
}
