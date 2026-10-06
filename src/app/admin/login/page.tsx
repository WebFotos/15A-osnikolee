import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sparkles, Lock } from "lucide-react";

export default function AdminLoginPage() {
  async function login(formData: FormData) {
    "use server";
    const password = formData.get("password") as string;
    const correctPassword = process.env.ADMIN_PASSWORD || "123456789-";
    
    if (password === correctPassword) {
      cookies().set("admin_session", "authenticated", { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      });
      redirect("/admin");
    }
    // If fail, we just redirect back to login for simplicity (or throw error, but let's keep it simple)
    redirect("/admin/login?error=1");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 relative z-10">
      <div className="w-full max-w-sm bg-forest-deep/80 border border-gold-soft/30 p-8 rounded-3xl shadow-2xl backdrop-blur-md text-center">
        <Lock className="w-12 h-12 text-gold-warm mx-auto mb-6 opacity-80" />
        <h1 className="font-serif text-3xl font-bold text-cream mb-2">Administración</h1>
        <p className="font-sans text-gold-soft/80 text-sm mb-8">Introduce la contraseña de acceso</p>

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
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
}
