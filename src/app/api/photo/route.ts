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

// DELETE /api/photo — Delete a photo belonging strictly to the current session
export async function DELETE(req: NextRequest) {
  try {
    // 1. Get session from cookie
    const sessionId = await getVerifiedSessionId();
    if (!sessionId) {
      return NextResponse.json({ message: 'Sin sesión activa' }, { status: 401 });
    }

    // 2. Check if event is already closed / revealed by admin
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('status')
      .eq('id', EVENT_ID)
      .single();

    if (eventError || !event) {
      console.error('[DELETE /api/photo] Event error:', eventError);
      return NextResponse.json({ message: 'Error al verificar estado del evento' }, { status: 500 });
    }

    if (event.status === 'REVEALED') {
      return NextResponse.json({ 
        message: 'El álbum ya ha sido cerrado por el administrador. Las fotografías ya no se pueden eliminar.' 
      }, { status: 403 });
    }

    // 3. Extract photo ID from query param or json body
    const url = new URL(req.url);
    let photoId = url.searchParams.get('id');
    if (!photoId) {
      try {
        const body = await req.json();
        photoId = body?.id || body?.photoId;
      } catch {
        // ignore json parse error
      }
    }

    if (!photoId) {
      return NextResponse.json({ message: 'ID de fotografía requerido' }, { status: 400 });
    }

    // 4. Find the photo and verify ownership
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('id, session_id, storage_path')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ message: 'Fotografía no encontrada' }, { status: 404 });
    }

    // 5. SECURITY: Only the owner session can delete their own photo
    if (photo.session_id !== sessionId) {
      return NextResponse.json({ message: 'No tienes permiso para eliminar esta fotografía' }, { status: 403 });
    }

    // 6. Delete from database (atomic)
    const { error: dbDeleteError } = await supabaseAdmin
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('session_id', sessionId);

    if (dbDeleteError) {
      console.error('[DELETE /api/photo] DB delete error:', dbDeleteError);
      return NextResponse.json({ message: 'Error al eliminar la fotografía de la base de datos' }, { status: 500 });
    }

    // 7. Remove physical file from Supabase Storage
    if (photo.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('event_photos')
        .remove([photo.storage_path]);
      
      if (storageError) {
        console.warn('[DELETE /api/photo] Storage remove warning:', storageError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Fotografía eliminada correctamente' 
    });
  } catch (err) {
    console.error('[DELETE /api/photo] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

