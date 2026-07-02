import { NextResponse } from "next/server";
import {
  getCurrentUser,
  safeRelativeReturnPath,
  setSessionCookie,
  registerPath,
} from "../../../app-auth";
import {
  createUserSession,
  DuplicateUserError,
  getRegisteredUserCount,
  MaxUsersError,
  registerUser,
} from "../../../server/sqlite-store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const returnTo = safeRelativeReturnPath(String(formData.get("return_to") ?? "/"));
  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const registeredUsers = await getRegisteredUserCount();

  if (registeredUsers > 0) {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== "admin") {
      return redirectWithError(request.url, returnTo, "forbidden");
    }
  }

  if (!email || !displayName || !password) {
    return redirectWithError(request.url, returnTo, "missing");
  }

  if (password.length < 12) {
    return redirectWithError(request.url, returnTo, "password");
  }

  try {
    const user = await registerUser({ displayName, email, password });
    if (registeredUsers === 0) {
      const session = await createUserSession(user.id);
      const response = NextResponse.redirect(new URL(returnTo, request.url));
      setSessionCookie(response, session.token, session.expiresAt);
      return response;
    }
    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (error) {
    if (error instanceof DuplicateUserError) {
      return redirectWithError(request.url, returnTo, "duplicate");
    }
    if (error instanceof MaxUsersError) {
      return redirectWithError(request.url, returnTo, "max-users");
    }
    return redirectWithError(request.url, returnTo, "failed");
  }
}

function redirectWithError(requestUrl: string, returnTo: string, error: string) {
  const target = `${registerPath(returnTo)}&error=${encodeURIComponent(error)}`;
  return NextResponse.redirect(new URL(target, requestUrl));
}
