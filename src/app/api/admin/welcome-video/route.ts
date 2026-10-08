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

export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (error || !data) {
      return NextResponse.json({ active: false, videoUrl: null });
    }
    const text = await data.text();
    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    return NextResponse.json({ active: false, videoUrl: null });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const formData = await req.formData();
    const action = formData.get('action') as string;

    if (action === 'toggle') {
      const active = formData.get('active') === 'true';
      const { data: configData } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
      if (!configData) return NextResponse.json({ message: 'No hay configuración' }, { status: 404 });
      
      const config = JSON.parse(await configData.text());
      config.active = active;
      await supabaseAdmin.storage.from(BUCKET_NAME).upload(CONFIG_PATH, JSON.stringify(config), { upsert: true });
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
        return NextResponse.json({ message: 'Archivo de vídeo no válido' }, { status: 400 });
      }
      if (video.size > 50 * 1024 * 1024) {
        return NextResponse.json({ message: 'El vídeo es demasiado grande (máx 50MB)' }, { status: 400 });
      }

      // 1. Ensure bucket exists or created manually already, we know it exists because we created it.
      // 2. Upload video
      const fileExt = video.name.split('.').pop() || 'mp4';
      const videoPath = `${VIDEO_PATH_PREFIX}_${Date.now()}.${fileExt}`;
      const arrayBuffer = await video.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(videoPath, buffer, {
          contentType: video.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Error subiendo vídeo:', uploadError);
        return NextResponse.json({ message: 'Error al subir el vídeo' }, { status: 500 });
      }

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

      const config = { active: true, videoUrl, videoPath, updatedAt: new Date().toISOString() };
      await supabaseAdmin.storage.from(BUCKET_NAME).upload(CONFIG_PATH, JSON.stringify(config), { upsert: true });

      return NextResponse.json(config);
    }

    return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
  } catch (err) {
    console.error('Error en admin/welcome-video:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
