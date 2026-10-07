import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/cookie-sign';
import { supabaseAdmin, EVENT_ID } from '@/lib/supabase-server';

function isAdminAuthenticated(): boolean {
  const token = cookies().get('admin_session')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

// GET /api/admin/event — Get event status
export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, name, status')
    .eq('id', EVENT_ID)
    .single();

  if (error || !data) {
    return NextResponse.json({ message: 'Evento no encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/admin/event — Update event status
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { status } = body;

    if (status !== 'PRIVATE' && status !== 'REVEALED') {
      return NextResponse.json({ message: 'Estado no válido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update({ status })
      .eq('id', EVENT_ID)
      .select('status')
      .single();

    if (error) {
      console.error('[PATCH /api/admin/event]', error);
      return NextResponse.json({ message: 'Error al actualizar el estado' }, { status: 500 });
    }

    return NextResponse.json({ status: data.status });
  } catch (err) {
    console.error('[PATCH /api/admin/event] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
