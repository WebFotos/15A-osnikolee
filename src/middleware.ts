import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware runs in Edge Runtime (no Node.js crypto).
 * Strategy: 
 *   - Check cookie existence here (prevents navigation to protected pages).
 *   - Full HMAC signature verification happens in each API route before touching data.
 * 
 * This means: a forged cookie gets past routing but fails at every data API call.
 * The data is always protected at the API layer.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- Admin protection ---
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('admin_session')?.value;
    // Cookie must exist and have the expected structure (value.hmac format)
    if (!adminToken || !adminToken.includes('.') || !adminToken.startsWith('admin:')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // --- Guest camera / fotos protection ---
  if (path.startsWith('/camara') || path.startsWith('/mis-fotos')) {
    const guestToken = request.cookies.get('guest_session_token')?.value;
    if (!guestToken || !guestToken.includes('.')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/camara', '/mis-fotos'],
};
