import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const path = request.nextUrl.pathname;

  // Protected client routes - require authentication
  const clientRoutes = ['/profil', '/mes-projets', '/mes-devis'];
  if (clientRoutes.some((route) => path.startsWith(route))) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(path)}`, request.url));
    }
  }

  // Admin routes - require token (role check happens in layout)
  if (path.startsWith('/admin')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Auth routes - redirect to home if already logged in
  const authRoutes = ['/login', '/register'];
  if (authRoutes.some((route) => path === route)) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profil/:path*', '/mes-projets/:path*', '/mes-devis/:path*', '/admin/:path*', '/login', '/register'],
};
