import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/login'];
const CHANGE_PASSWORD_PATH = '/change-password';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isChangePasswordPage = pathname === CHANGE_PASSWORD_PATH;

  if (!session?.user) {
    if (isPublic) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Already authenticated, but must change password.
  if (session.user.mustChangePassword && !isChangePasswordPage) {
    const url = req.nextUrl.clone();
    url.pathname = CHANGE_PASSWORD_PATH;
    return NextResponse.redirect(url);
  }

  // Authenticated user trying to hit /login → bounce to home
  if (isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on every page except Next.js internals, the auth API and static files
    '/((?!api/auth|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)',
  ],
};
