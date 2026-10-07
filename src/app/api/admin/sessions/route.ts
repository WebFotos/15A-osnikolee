import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/cookie-sign';
import { supabaseAdmin } from '@/lib/supabase-server';

function isAdminAuthenticated(): boolean {
  const token = cookies().get('admin_session')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

// GET /api/admin/sessions — All guest sessions with photo counts
export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('guest_sessions')
      .select('id, guest_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/admin/sessions]', error);
      return NextResponse.json({ message: 'Error al cargar sesiones' }, { status: 500 });
    }

    // Get photo counts for each session
    const sessionsWithCount = await Promise.all(
      (sessions ?? []).map(async (s) => {
        const { count } = await supabaseAdmin
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', s.id);
        return { ...s, photo_count: count ?? 0 };
      })
    );

    return NextResponse.json(sessionsWithCount.sort((a, b) => b.photo_count - a.photo_count));
  } catch (err) {
    console.error('[GET /api/admin/sessions] Unexpected error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
