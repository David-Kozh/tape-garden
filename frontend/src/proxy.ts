import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/types";

/**
 * Base64 JWT Payload Decoder
 * Runs natively in the Vercel Edge / Next.js proxy runtime without external dependencies.
 */
function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Next.js 16 Proxy Gate
 * Intercepts requests on protected routes and validates JWT claims from __session cookie.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the official Firebase-compatible __session cookie
  const sessionCookie = request.cookies.get("__session")?.value;

  // Path groups definitions
  const isProducerPath = pathname.startsWith("/dashboard") || pathname.startsWith("/sample-packs");
  const isAdminPath = pathname.startsWith("/admin");
  const isAuthProtectedPath = pathname.startsWith("/checkout") || pathname.startsWith("/purchases") || isProducerPath || isAdminPath;

  // If visiting an authenticated route without a session, redirect to /login
  if (isAuthProtectedPath && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If session is present on a protected route, parse and inspect roles
  if (isAuthProtectedPath && sessionCookie) {
    const claims = decodeJwt(sessionCookie);

    if (!claims) {
      // Invalid/tampered token, clear cookie and send to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("__session");
      return response;
    }

    // Standard claims expiration check (exp is in Unix seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < currentTime) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("__session");
      return response;
    }

    // Role assertions
    const role: UserRole = claims.role || (claims.admin ? "admin" : claims.producer ? "producer" : "buyer");

    // Admin paths check
    if (isAdminPath && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url)); // Send to home or unauthorized page
    }

    // Producer/members path check
    if (isProducerPath && role !== "producer" && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url)); // Send to home
    }
  }

  return NextResponse.next();
}

// Config matcher to run proxy on specific paths
export const config = {
  matcher: [
    "/checkout/:path*",
    "/purchases/:path*",
    "/dashboard/:path*",
    "/sample-packs/:path*",
    "/admin/:path*",
  ],
};
