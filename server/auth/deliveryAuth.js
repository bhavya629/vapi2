import { getAuthenticatedUser } from "./adminAuth";
export async function requireDeliveryOperator(req) {
  const user = await getAuthenticatedUser(req);
  if (!user)
    return {
      status: 401,
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      },
    };
  if (!["ADMIN", "DELIVERY_MANAGER"].includes(user.role))
    return {
      status: 403,
      error: {
        code: "FORBIDDEN",
        message: "Delivery operations access is required.",
      },
    };
  return { user };
}
