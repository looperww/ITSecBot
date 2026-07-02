import { NextResponse } from "next/server";
import { clearSessionCookie, safeRelativeReturnPath } from "../../app-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeRelativeReturnPath(url.searchParams.get("return_to") ?? "/");
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  await clearSessionCookie(response);
  return response;
}
