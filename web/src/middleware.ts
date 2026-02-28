import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.SITE_PASSWORD || 'Are100412';
const COOKIE_NAME = 'arc-auth';

export function middleware(request: NextRequest) {
  // 인증 API는 통과
  if (request.nextUrl.pathname === '/api/auth') {
    return NextResponse.next();
  }

  // 쿠키 확인
  const auth = request.cookies.get(COOKIE_NAME);
  if (auth?.value === PASSWORD) {
    return NextResponse.next();
  }

  // 인증 안 됨 → 로그인 페이지로
  if (request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};
