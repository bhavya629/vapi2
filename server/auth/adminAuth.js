import { authenticate, readToken } from "@/server/auth/sessionAuth";

export function readAuthToken(req) {
  return readToken(req);
}

export async function getAuthenticatedUser(req) {
  const auth = await authenticate(req);
  return auth.user || null;
}

export async function requireAdmin(req) {
  const auth = await authenticate(req),
    user = auth.user;
  if (auth.error === "ACCOUNT_SUSPENDED")
    return {
      status: 403,
      error: {
        code: "ACCOUNT_SUSPENDED",
        message:
          "This account is currently unavailable. Please contact The Cellphone Studio for assistance.",
      },
    };
  if (!user)
    return {
      status: 401,
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      },
    };
  if (user.role !== "ADMIN")
    return {
      status: 403,
      error: {
        code: "FORBIDDEN",
        message: "Administrator access is required.",
      },
    };
  return { user };
}
