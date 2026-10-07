import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyCookieValue } from '@/lib/cookie-sign';

const GUEST_COOKIE = 'guest_session_token';
const SIGNED_URL_EXPIRY = 60 * 60 * 12; // 12 hours

// GET /api/mis-fotos — Returns photos for the current session (from cookie)
export async function GET() {
  try {
    const raw = cookies().get(GUEST_COOKIE)?.value;
    const sessionId = raw ? verifyCookieValue(raw) : null;

    if (!sessionId) {
      return NextResponse.json({ message: 'Sin sesión activa' }, { status: 401 });
    }

    // Fetch photos belonging exclusively to this session
    const { data: photos, error } = await supabaseAdmin
      .from('photos')
      .select('id, session_id, storage_path, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/mis-fotos] Query error:', error);
      return NextResponse.json({ message: 'Error al cargar las fotos' }, { status: 500 });
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json([]);
    }

    // Generate signed URLs in batch
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        try {
          const { data, error } = await supabaseAdmin.storage
            .from('event_photos')
            .createSignedUrl(photo.storage_path, SIGNED_URL_EXPIRY);
          if (error) console.error("URL error:", error);
          return { ...photo, url: data?.signedUrl ?? '' };
        } catch (e) {
          console.error("URL exception:", e);
          return { ...photo, url: '' };
        }
      })
    );

    return NextResponse.json(photosWithUrls);
  } catch (err) {
    console.error('[GET /api/mis-fotos] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
