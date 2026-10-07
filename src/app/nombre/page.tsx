"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/storage";
import { Loader2, Sparkles } from "lucide-react";

export default function NombrePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setJoining(true);
    try {
      const session = await createSession(name.trim());
      localStorage.setItem("cd_session", session.id);
      router.push("/camara");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al crear la sesión.");
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] p-6 relative z-10">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto">
        <Sparkles className="w-12 h-12 text-gold-soft mb-6 opacity-80" />

        <h1 className="font-serif text-3xl mb-2 text-center text-cream">Antes de comenzar...</h1>
        <p className="font-sans text-gold-soft/80 mb-10 text-center text-lg">¿Cómo te llamas?</p>

        <form onSubmit={handleJoin} className="w-full space-y-8">
          <div>
            <input
              type="text"
              placeholder="Escribe tu nombre (ej. Carlos)"
              className="w-full bg-forest-deep/50 border border-gold-soft/30 rounded-2xl px-6 py-5 text-lg text-cream placeholder-cream/30 focus:outline-none focus:border-gold-warm focus:bg-forest-deep/80 transition-all font-sans text-center backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.2)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={30}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full btn-gold font-bold py-5 rounded-2xl disabled:opacity-50 flex items-center justify-center transition-all text-lg font-sans"
          >
            {joining ? <Loader2 className="w-6 h-6 animate-spin" /> : "COMENZAR"}
          </button>
        </form>
      </div>
    </div>
  );
}
