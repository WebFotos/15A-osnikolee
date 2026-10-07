import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/cookie-sign';
import { supabaseAdmin } from '@/lib/supabase-server';

const SIGNED_URL_EXPIRY = 60 * 60 * 12; // 12 hours — admin previews photos for the night

function isAdminAuthenticated(): boolean {
  const token = cookies().get('admin_session')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

// GET /api/admin/photos — All photos with signed URLs (admin only)
export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data: photos, error } = await supabaseAdmin
      .from('photos')
      .select('id, session_id, storage_path, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/admin/photos]', error);
      return NextResponse.json({ message: 'Error al cargar fotos' }, { status: 500 });
    }

    if (!photos || photos.length === 0) return NextResponse.json([]);

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
    console.error('[GET /api/admin/photos] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
