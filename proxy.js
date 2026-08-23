import { auth } from "@/auth";

export default auth((request) => {
  const isLoggedIn = !!request.auth;

  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup";

  // Logged-in users should not see authentication pages.
  if (isLoggedIn && isAuthPage) {
    return Response.redirect(
      new URL("/", request.url),
    );
  }

  // Logged-out users cannot access the application.
  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(
      new URL("/login", request.url),
    );
  }

  return;
});

export const config = {
  matcher: [
    /*
     * Protect application pages.
     *
     * API routes are excluded because each API route
     * handles authentication itself with requireUser().
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};