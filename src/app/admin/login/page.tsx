import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sparkles, Lock } from 'lucide-react';
import { createAdminToken } from '@/lib/cookie-sign';

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  async function login(formData: FormData) {
    'use server';
    const password = (formData.get('password') ?? '').toString();
    const correctPassword = process.env.ADMIN_PASSWORD || '123456789-';

    if (password === correctPassword) {
      // Create a signed token — NOT just a plain "authenticated" string
      const signedToken = createAdminToken();
      cookies().set('admin_session', signedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });
      redirect('/admin');
    }

    redirect('/admin/login?error=1');
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 relative z-10">
      <div className="w-full max-w-sm bg-forest-deep/80 border border-gold-soft/30 p-8 rounded-3xl shadow-2xl backdrop-blur-md text-center">
        <Lock className="w-12 h-12 text-gold-warm mx-auto mb-6 opacity-80" />
        <h1 className="font-serif text-3xl font-bold text-cream mb-2">Administración</h1>
        <p className="font-sans text-cream/80 text-sm mb-2">Recuerdo de mis 15 años</p>
        <p className="font-sans text-cream/80 text-sm mb-8">Introduce la contraseña de acceso</p>

        {searchParams.error && (
          <p className="font-sans text-red-400 text-sm mb-4">Contraseña incorrecta.</p>
        )}

        <form action={login} className="flex flex-col gap-6">
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            required
            className="w-full bg-black/40 border border-gold-soft/20 rounded-xl px-4 py-4 text-center text-cream focus:outline-none focus:border-gold-warm transition-colors font-sans"
          />
          <button
            type="submit"
            className="btn-gold font-bold py-4 rounded-xl flex items-center justify-center font-sans shadow-[0_0_15px_rgba(216,182,90,0.2)]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
}
