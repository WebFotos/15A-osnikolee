import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin, EVENT_ID } from '@/lib/supabase-server';
import { verifyCookieValue } from '@/lib/cookie-sign';

const GUEST_COOKIE = 'guest_session_token';
const MAX_PHOTOS = 24;
const SIGNED_URL_EXPIRY = 60 * 60 * 12; // 12 hours

async function getVerifiedSessionId(): Promise<string | null> {
  const raw = cookies().get(GUEST_COOKIE)?.value;
  if (!raw) return null;
  return verifyCookieValue(raw);
}

// POST /api/photo — Upload a photo for the current session
export async function POST(req: NextRequest) {
  try {
    // 1. Get session from cookie — NOT from request body
    const sessionId = await getVerifiedSessionId();
    if (!sessionId) {
      return NextResponse.json({ message: 'Sin sesión activa' }, { status: 401 });
    }

    // 2. Verify session exists in DB
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('guest_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ message: 'Sesión no válida' }, { status: 401 });
    }

    // 3. Atomic limit check — count current photos for this session
    const { count, error: countError } = await supabaseAdmin
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countError) {
      console.error('[POST /api/photo] Count error:', countError);
      return NextResponse.json({ message: 'Error al verificar el límite de fotos' }, { status: 500 });
    }

    if ((count ?? 0) >= MAX_PHOTOS) {
      return NextResponse.json({ message: 'No quedan fotografías disponibles (límite de 24 alcanzado)' }, { status: 409 });
    }

    // 4. Parse form data — session_id in body is IGNORED
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ message: 'No se recibió ninguna foto' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: 'La foto es demasiado grande (máx 10MB)' }, { status: 400 });
    }

    // 5. Build storage path using server-controlled sessionId
    const fileExt = file.type.includes('jpeg') ? 'jpg' : 'png';
    const storagePath = `${EVENT_ID}/${sessionId}/${Date.now()}.${fileExt}`;

    // 6. Upload to bucket
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('event_photos')
      .upload(storagePath, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[POST /api/photo] Upload error:', uploadError);
      return NextResponse.json({ message: 'Error al subir la fotografía' }, { status: 500 });
    }

    // 7. Atomic Insert using RPC
    const { data: photoRecord, error: insertError } = await supabaseAdmin
      .rpc('insert_photo_if_under_limit', {
        p_session_id: sessionId,
        p_storage_path: storagePath
      });

    if (insertError || !photoRecord) {
      console.error('[POST /api/photo] Insert error:', insertError);
      // Cleanup orphaned file
      await supabaseAdmin.storage.from('event_photos').remove([storagePath]);
      
      if (insertError?.message?.includes('LIMIT_REACHED')) {
         return NextResponse.json({ message: 'No quedan fotografías disponibles (límite de 24 alcanzado)' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Error al guardar la fotografía' }, { status: 500 });
    }

    // 8. Generate signed URL (private bucket)
    const { data: signedData } = await supabaseAdmin.storage
      .from('event_photos')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    return NextResponse.json({
      ...photoRecord,
      url: signedData?.signedUrl ?? '',
    });
  } catch (err) {
    console.error('[POST /api/photo] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
