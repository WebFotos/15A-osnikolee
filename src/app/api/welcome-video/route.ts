import { NextResponse } from 'next/server';
import { supabaseAdmin, EVENT_ID } from '@/lib/supabase-server';

const BUCKET_NAME = 'event_assets';
const CONFIG_PATH = `${EVENT_ID}/welcome-config.json`;

export async function GET() {
  try {
    const { data: configData, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (error || !configData) {
      return NextResponse.json({ active: false, videoUrl: null });
    }

    const text = await configData.text();
    const config = JSON.parse(text);
    
    if (config.active && config.videoUrl) {
      return NextResponse.json({ active: true, videoUrl: config.videoUrl });
    }
    
    return NextResponse.json({ active: false, videoUrl: null });
  } catch (err) {
    return NextResponse.json({ active: false, videoUrl: null });
  }
}
