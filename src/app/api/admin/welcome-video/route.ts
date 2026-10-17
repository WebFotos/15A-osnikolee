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
 * Verifies we can actually access the known bucket by listing at most 1 item.
 * Avoids listBuckets() which requires special admin permissions that can fail in Vercel.
 * Returns null on success, or an error stage string on failure.
 */
async function verifyBucketAccess(): Promise<string | null> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .list(`${EVENT_ID}`, { limit: 1 });

  if (error) {
    console.error('[VERIFY_BUCKET_ACCESS] FAILED:', {
      message: error.message,
      name: error.name,
      statusCode: (error as any).statusCode ?? (error as any).status ?? 'unknown',
    });
    return 'BUCKET_ACCESS';
  }

  return null;
}

// ─── GET: fetch current config ────────────────────────────────────────────────
export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (error || !data) return NextResponse.json({ active: false, videoUrl: null });
    const text = await data.text();
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ active: false, videoUrl: null });
  }
}

// ─── POST: actions ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  console.log('[admin/welcome-video] Supabase URL prefix:', (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING').slice(0, 30));

  try {
    const formData = await req.formData();
    const action = formData.get('action') as string;

    // ── ACTION: get-upload-url ──────────────────────────────────────────────
    // Returns a short-lived signed URL so the browser can upload DIRECTLY to
    // Supabase Storage, bypassing Vercel's 4.5 MB function body limit.
    if (action === 'get-upload-url') {
      const ext = (formData.get('ext') as string) || 'mp4';

      // Verify bucket access directly — no listBuckets() needed
      const accessError = await verifyBucketAccess();
      if (accessError) {
        return NextResponse.json(
          { message: `Error de acceso al almacenamiento (${accessError}). Comprueba que el bucket '${BUCKET_NAME}' existe y que las credenciales del servidor tienen permisos suficientes.` },
          { status: 500 }
        );
      }

      const videoPath = `${VIDEO_PATH_PREFIX}_${Date.now()}.${ext}`;

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(videoPath);

      if (error || !data) {
        console.error('[GET_UPLOAD_URL] FAILED:', error);
        return NextResponse.json({ message: 'Error generando URL de subida' }, { status: 500 });
      }

      console.log('[GET_UPLOAD_URL] OK — videoPath:', videoPath);

      return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, videoPath });
    }

    // ── ACTION: confirm-upload ──────────────────────────────────────────────
    // Called after the browser has uploaded the video directly to Supabase.
    // Saves the config JSON and deletes the old video.
    if (action === 'confirm-upload') {
      const videoPath = formData.get('videoPath') as string;
      if (!videoPath) {
        return NextResponse.json({ message: 'videoPath requerido' }, { status: 400 });
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(videoPath);
      const videoUrl = publicUrlData.publicUrl;

      // Delete old video if exists
      const { data: configData } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
      if (configData) {
        try {
          const oldConfig = JSON.parse(await configData.text());
          if (oldConfig.videoPath && oldConfig.videoPath !== videoPath) {
            await supabaseAdmin.storage.from(BUCKET_NAME).remove([oldConfig.videoPath]);
          }
        } catch { /* ignore JSON parse errors */ }
      }

      const config = { active: true, videoUrl, videoPath, updatedAt: new Date().toISOString() };

      console.log('[UPLOAD_CONFIG] Saving config:', CONFIG_PATH);

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

    // ── ACTION: toggle ──────────────────────────────────────────────────────
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

    // ── ACTION: delete ──────────────────────────────────────────────────────
    if (action === 'delete') {
      const { data: configData } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
      if (configData) {
        try {
          const config = JSON.parse(await configData.text());
          if (config.videoPath) {
            await supabaseAdmin.storage.from(BUCKET_NAME).remove([config.videoPath]);
          }
        } catch { /* ignore */ }
      }
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([CONFIG_PATH]);
      return NextResponse.json({ active: false, videoUrl: null });
    }

    return NextResponse.json({ message: 'Accion invalida' }, { status: 400 });
  } catch (err) {
    console.error('[admin/welcome-video] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}