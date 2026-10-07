import { NextResponse } from 'next/server';
import { supabaseAdmin, EVENT_ID } from '@/lib/supabase-server';

const SIGNED_URL_EXPIRY = 60 * 60 * 12; // 12 hours

// GET /api/album — Public album endpoint, only returns photos when event is REVEALED
export async function GET() {
  try {
    // Check event status
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('status')
      .eq('id', EVENT_ID)
      .single();

    if (!event || event.status !== 'REVEALED') {
      return NextResponse.json({ message: 'El álbum aún no está disponible' }, { status: 403 });
    }

    const { data: photos, error } = await supabaseAdmin
      .from('photos')
      .select('id, session_id, storage_path, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GET /api/album] Query error:', error);
      return NextResponse.json({ message: 'Error al cargar el álbum' }, { status: 500 });
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json([]);
    }

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data } = await supabaseAdmin.storage
          .from('event_photos')
          .createSignedUrl(photo.storage_path, SIGNED_URL_EXPIRY);
        return { ...photo, url: data?.signedUrl ?? '' };
      })
    );

    return NextResponse.json(photosWithUrls);
  } catch (err) {
    console.error('[GET /api/album] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
