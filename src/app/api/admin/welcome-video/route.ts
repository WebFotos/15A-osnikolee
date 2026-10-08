import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, EVENT_ID } from '@/lib/supabase-server';
import { verifyAdminToken } from '@/lib/cookie-sign';
import { cookies } from 'next/headers';

const BUCKET_NAME = 'event_assets';
const CONFIG_PATH = `${EVENT_ID}/welcome-config.json`;
const VIDEO_PATH_PREFIX = `${EVENT_ID}/welcome_video`;

function isAdminAuthenticated(): boolean {
  const token = cookies().get('admin_session')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

/**
 * Ensures the bucket exists with the correct MIME type configuration.
 * Returns null on success, or an error string describing the failure stage.
 */
async function ensureBucket(): Promise<string | null> {
  // ── LIST_BUCKETS ──────────────────────────────────────────────────────────
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

  if (listError) {
    console.error('[LIST_BUCKETS] FAILED:', {
      message: listError.message,
      name: listError.name,
      statusCode: (listError as any).statusCode ?? (listError as any).status ?? 'unknown',
    });
    return 'LIST_BUCKETS';
  }

  const exists = (buckets ?? []).some(b => b.name === BUCKET_NAME);

  if (!exists) {
    // ── CREATE_BUCKET ───────────────────────────────────────────────────────
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'application/json'],
    });

    if (createError) {
      console.error('[CREATE_BUCKET] FAILED:', {
        message: createError.message,
        name: createError.name,
        statusCode: (createError as any).statusCode ?? (createError as any).status ?? 'unknown',
      });
      return 'CREATE_BUCKET';
    }

    console.log('[CREATE_BUCKET] OK — bucket created');
  } else {
    // ── UPDATE_BUCKET ───────────────────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'application/json'],
    });

    if (updateError) {
      console.error('[UPDATE_BUCKET] FAILED:', {
        message: updateError.message,
        name: updateError.name,
        statusCode: (updateError as any).statusCode ?? (updateError as any).status ?? 'unknown',
      });
      return 'UPDATE_BUCKET';
    }

    console.log('[UPDATE_BUCKET] OK — MIME types updated');
  }

  return null; // success
}

export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (error || !data) {
      return NextResponse.json({ active: false, videoUrl: null });
    }
    const text = await data.text();
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ active: false, videoUrl: null });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  // Log Supabase URL (safe — not the key)
  console.log('[admin/welcome-video] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING');

  try {
    const formData = await req.formData();
    const action = formData.get('action') as string;

    if (action === 'toggle') {
      const active = formData.get('active') === 'true';
      const { data: configData } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
      if (!configData) return NextResponse.json({ message: 'No hay configuracion' }, { status: 404 });

      const config = JSON.parse(await configData.text());
      config.active = active;
      await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(CONFIG_PATH, JSON.stringify(config), { upsert: true, contentType: 'application/json' });
      return NextResponse.json(config);
    }

    if (action === 'delete') {
      const { data: configData } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
      if (configData) {
        const config = JSON.parse(await configData.text());
        if (config.videoPath) {
          await supabaseAdmin.storage.from(BUCKET_NAME).remove([config.videoPath]);
        }
      }
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([CONFIG_PATH]);
      return NextResponse.json({ active: false, videoUrl: null });
    }

    if (action === 'upload') {
      const video = formData.get('video') as File;
      if (!video || !video.type.startsWith('video/')) {
        return NextResponse.json({ message: 'Archivo de video no valido' }, { status: 400 });
      }
      if (video.size > 50 * 1024 * 1024) {
        return NextResponse.json({ message: 'El video es demasiado grande (max 50MB)' }, { status: 400 });
      }

      // ── ENSURE BUCKET ────────────────────────────────────────────────────
      const bucketError = await ensureBucket();
      if (bucketError) {
        return NextResponse.json(
          { message: `Error de almacenamiento (${bucketError}). Contacta al administrador.` },
          { status: 500 }
        );
      }

      // ── UPLOAD_VIDEO ─────────────────────────────────────────────────────
      const fileExt = video.name.split('.').pop() || 'mp4';
      const videoPath = `${VIDEO_PATH_PREFIX}_${Date.now()}.${fileExt}`;
      const arrayBuffer = await video.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log('[UPLOAD_VIDEO] Attempting upload:', { videoPath, contentType: video.type, sizeBytes: buffer.length });

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(videoPath, buffer, { contentType: video.type, upsert: true });

      if (uploadError) {
        console.error('[UPLOAD_VIDEO] FAILED:', {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: (uploadError as any).statusCode ?? (uploadError as any).status ?? 'unknown',
        });
        return NextResponse.json({ message: 'Error al subir el video' }, { status: 500 });
      }

      console.log('[UPLOAD_VIDEO] OK');

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(videoPath);
      const videoUrl = publicUrlData.publicUrl;

      // Delete old video if exists
      const { data: configData } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
      if (configData) {
        const oldConfig = JSON.parse(await configData.text());
        if (oldConfig.videoPath) {
          await supabaseAdmin.storage.from(BUCKET_NAME).remove([oldConfig.videoPath]);
        }
      }

      // ── UPLOAD_CONFIG ────────────────────────────────────────────────────
      const config = { active: true, videoUrl, videoPath, updatedAt: new Date().toISOString() };

      console.log('[UPLOAD_CONFIG] Attempting config save:', CONFIG_PATH);

      const { error: configError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(CONFIG_PATH, JSON.stringify(config), { upsert: true, contentType: 'application/json' });

      if (configError) {
        console.error('[UPLOAD_CONFIG] FAILED:', {
          message: configError.message,
          name: configError.name,
          statusCode: (configError as any).statusCode ?? (configError as any).status ?? 'unknown',
        });
        return NextResponse.json({ message: 'Error al guardar configuracion del video' }, { status: 500 });
      }

      console.log('[UPLOAD_CONFIG] OK');

      return NextResponse.json(config);
    }

    return NextResponse.json({ message: 'Accion invalida' }, { status: 400 });
  } catch (err) {
    console.error('[admin/welcome-video] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}