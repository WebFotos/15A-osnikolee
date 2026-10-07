import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin, EVENT_ID } from '@/lib/supabase-server';
import { signCookieValue, verifyCookieValue } from '@/lib/cookie-sign';

const GUEST_COOKIE = 'guest_session_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Reads and verifies the guest session cookie. Returns session UUID or null. */
async function getSessionIdFromCookie(): Promise<string | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get(GUEST_COOKIE)?.value;
  if (!raw) return null;
  return verifyCookieValue(raw); // Returns UUID string or null
}

// POST /api/session — Create a new guest session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const guestName = (body.guest_name ?? '').toString().trim();

    if (!guestName || guestName.length > 50) {
      return NextResponse.json({ message: 'Nombre inválido' }, { status: 400 });
    }

    // Fetch the real event (service_role bypasses RLS)
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', EVENT_ID)
      .single();

    if (eventError || !event) {
      console.error('[POST /api/session] Event not found:', eventError);
      return NextResponse.json({ message: 'Evento no encontrado' }, { status: 500 });
    }

    // Create the guest session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('guest_sessions')
      .insert({ event_id: event.id, guest_name: guestName })
      .select('id, guest_name, created_at')
      .single();

    if (sessionError || !session) {
      console.error('[POST /api/session] Session insert error:', sessionError);
      return NextResponse.json({ message: 'Error al crear la sesión' }, { status: 500 });
    }

    // Sign the session UUID for the cookie
    const signedToken = signCookieValue(session.id);

    const response = NextResponse.json({
      id: session.id,
      guest_name: session.guest_name,
    });

    response.cookies.set(GUEST_COOKIE, signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (err) {
    console.error('[POST /api/session] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// GET /api/session — Get current session info from cookie
export async function GET() {
  try {
    const sessionId = await getSessionIdFromCookie();

    if (!sessionId) {
      return NextResponse.json({ message: 'Sin sesión activa' }, { status: 401 });
    }

    const { data: session, error } = await supabaseAdmin
      .from('guest_sessions')
      .select('id, guest_name, created_at')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      // Session doesn't exist in DB — clear cookie
      const response = NextResponse.json({ message: 'Sesión no válida' }, { status: 401 });
      response.cookies.delete(GUEST_COOKIE);
      return response;
    }

    // Count photos for this session
    const { count } = await supabaseAdmin
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    const photoCount = count ?? 0;

    return NextResponse.json({
      id: session.id,
      guest_name: session.guest_name,
      created_at: session.created_at,
      photo_count: photoCount,
      photos_remaining: Math.max(0, 24 - photoCount),
    });
  } catch (err) {
    console.error('[GET /api/session] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/session — Clear session cookie (switch guest)
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(GUEST_COOKIE);
  return response;
}
