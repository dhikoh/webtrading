import { NextResponse } from 'next/server';

export function middleware(req) {
  const token = req.cookies.get('auth_token')?.value;
  const { pathname } = req.nextUrl;

  // 1. Static resources and auth endpoints are bypassed
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/static') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // 2. Redirect to login if token is missing
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // 3. Decode JWT payload locally at Edge level
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const rawPayload = atob(base64);
    const user = JSON.parse(rawPayload);

    // Check expiry
    if (user.exp && Date.now() >= user.exp * 1000) {
      const res = NextResponse.redirect(new URL('/login', req.url));
      res.cookies.delete('auth_token');
      return res;
    }

    // 4. Role-based protection: Admin routes (Allow SUPER_ADMIN and ADMIN)
    if (pathname.startsWith('/admin')) {
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN'];
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.redirect(new URL('/dashboard/portfolio', req.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware token decode error:", error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
};
