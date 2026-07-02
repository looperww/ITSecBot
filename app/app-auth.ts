import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  deleteUserSession,
  getUserBySessionToken,
  type AppUser,
} from "./server/sqlite-store";

export type { AppUser };

const SESSION_COOKIE = "secops_session";
const SIGN_IN_PATH = "/auth/sign-in";
const SIGN_OUT_PATH = "/auth/sign-out";
const REGISTER_PATH = "/auth/register";

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  return getUserBySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireCurrentUser(returnTo: string): Promise<AppUser> {
  const user = await getCurrentUser();
  if (user) return user;

  redirect(signInPath(returnTo));
}

export function signInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function registerPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${REGISTER_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function signOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set({
    expires: expiresAt,
    httpOnly: true,
    name: SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.AUTH_COOKIE_SECURE === "1",
    value: token,
  });
}

export async function clearSessionCookie(response: NextResponse) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteUserSession(token);
  }
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.AUTH_COOKIE_SECURE === "1",
    value: "",
  });
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === REGISTER_PATH
  );
}
