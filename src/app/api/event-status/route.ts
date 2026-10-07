import { NextResponse } from 'next/server';
import { supabaseAdmin, EVENT_ID } from '@/lib/supabase-server';

// GET /api/event-status — Returns current event status (public)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('status')
      .eq('id', EVENT_ID)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: 'PRIVATE' });
    }

    return NextResponse.json({ status: data.status });
  } catch {
    return NextResponse.json({ status: 'PRIVATE' });
  }
}
