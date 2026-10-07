import { NextResponse, type NextRequest } from "next/server";

// Fast path: bounce signed-out visitors before rendering. Real session validation happens server-side.
export function middleware(req: NextRequest) {
  if (!req.cookies.has("mg_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/companion/:path*", "/journal/:path*", "/mood/:path*", "/manual/:path*", "/happy-place/:path*", "/future-me/:path*", "/letters/:path*", "/settings/:path*", "/reset/:path*", "/onboarding/:path*"],
};
