import { NextResponse } from "next/server";
import {
  safeRelativeReturnPath,
  setSessionCookie,
  signInPath,
} from "../../../app-auth";
import {
  authenticateUser,
  createUserSession,
  InvalidCredentialsError,
} from "../../../server/sqlite-store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const returnTo = safeRelativeReturnPath(String(formData.get("return_to") ?? "/"));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return redirectWithError(request.url, returnTo, "missing");
  }

  try {
    const user = await authenticateUser({ email, password });
    const session = await createUserSession(user.id);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return redirectWithError(request.url, returnTo, "credentials");
    }
    return redirectWithError(request.url, returnTo, "failed");
  }
}

function redirectWithError(requestUrl: string, returnTo: string, error: string) {
  const target = `${signInPath(returnTo)}&error=${encodeURIComponent(error)}`;
  return NextResponse.redirect(new URL(target, requestUrl));
}
