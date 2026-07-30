export function passwordError(value) {
  if (typeof value !== "string" || value.length < 6)
    return "Password must contain at least 6 characters.";
  if (value.length > 128)
    return "Password must contain 128 characters or fewer.";
  return null;
}
