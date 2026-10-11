import { NextResponse, type NextRequest } from "next/server";

// Fast path: bounce signed-out visitors before rendering. Real session and two-step checks happen server-side.
export function middleware(req: NextRequest) {
  if (!req.cookies.has("hv_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/children/:path*", "/requests/:path*", "/alerts/:path*", "/family/:path*", "/activity/:path*", "/settings/:path*", "/billing/:path*", "/onboarding/:path*", "/setup-2fa/:path*", "/login/verify"],
};
