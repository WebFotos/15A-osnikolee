"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSession, getEvent } from "@/lib/storage";
import { Event } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { use } from "react";

export default function EventWelcomePage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;
  const router = useRouter();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvent() {
      try {
        const ev = await getEvent(eventId);
        if (ev) {
          setEvent(ev);
        } else {
          setError("Evento no encontrado.");
        }
      } catch (err) {
        setError("Error al cargar el evento.");
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setJoining(true);
    try {
      const session = await createSession(eventId, name.trim());
      // Guardar sessionId en sessionStorage para persistencia local de la sesión de invitado
      sessionStorage.setItem(`session_${eventId}`, session.id);
      
      router.push(`/evento/${eventId}/camara`);
    } catch (err) {
      setError("No se pudo entrar al evento.");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Oops</h2>
        <p className="text-zinc-400">{error || "Algo salió mal"}</p>
      </div>
    );
  }

  if (event.status === 'CLOSED') {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Evento Cerrado</h2>
        <p className="text-zinc-400">Ya no se pueden tomar más fotos.</p>
      </div>
    );
  }

  if (event.status === 'REVEALED') {
    // Si ya está revelado, ir directo al álbum
    router.push(`/evento/${eventId}/album`);
    return null;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 p-6">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
        <p className="text-zinc-400 mb-10 text-center">
          ¡Bienvenido! Ingresa tu nombre para empezar a tomar fotos.
        </p>

        <form onSubmit={handleJoin} className="w-full space-y-6">
          <div>
            <input
              type="text"
              placeholder="Tu nombre (ej. Juan P.)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-white transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={30}
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full bg-white text-black font-bold text-lg py-4 rounded-xl disabled:opacity-50 flex items-center justify-center transition-colors"
          >
            {joining ? <Loader2 className="w-6 h-6 animate-spin" /> : "Entrar a la Cámara"}
          </button>
        </form>
      </div>
    </div>
  );
}
