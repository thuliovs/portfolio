import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthEnabled,
  isValidSession,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = await isValidSession(token);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (isLoginPage) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|icon.svg).*)"],
};
