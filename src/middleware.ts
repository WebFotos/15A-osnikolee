import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('admin_session')?.value;
    
    // We expect the token to be a simple hardcoded string or JWT in a real app.
    // For now, if the cookie exists and equals 'authenticated', we allow it.
    if (adminToken !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
