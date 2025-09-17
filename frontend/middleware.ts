import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 本番で開発用ルートを遮断
const BLOCKED_PATHS = ['/dev', '/design-system', '/playground'];

export function middleware(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV;
  if (env === 'production') {
    const { pathname } = req.nextUrl;
    if (BLOCKED_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};


