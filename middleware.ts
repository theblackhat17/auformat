import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auformat-session')?.value;
  const path = request.nextUrl.pathname;

  // Protected client routes - require authentication
  const clientRoutes = ['/profil', '/mes-projets', '/mes-devis'];
  if (clientRoutes.some((route) => path.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(path)}`, request.url));
    }
  }

  // Admin routes - require token (role check happens in layout)
  if (path.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Auth routes - redirect to home if already logged in
  const authRoutes = ['/login', '/register'];
  if (authRoutes.some((route) => path === route)) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profil/:path*', '/mes-projets/:path*', '/mes-devis/:path*', '/admin/:path*', '/login', '/register'],
};
