"use client";

import { useEffect, useState } from "react";
import { getEvent, getEventPhotos } from "@/lib/storage";
import { Event, Photo } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { use } from "react";
import Image from "next/image";

export default function AlbumPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAlbum() {
      try {
        const ev = await getEvent(eventId);
        if (!ev) {
          setError("Evento no encontrado.");
          return;
        }
        setEvent(ev);

        if (ev.status === 'REVEALED') {
          const evPhotos = await getEventPhotos(eventId);
          setPhotos(evPhotos);
        }
      } catch (err) {
        setError("Error al cargar el álbum.");
      } finally {
        setLoading(false);
      }
    }
    loadAlbum();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col min-h-[100dvh] items-center justify-center p-6 text-center">
        <p className="text-zinc-400">{error || "Algo salió mal"}</p>
      </div>
    );
  }

  if (event.status !== 'REVEALED') {
    return (
      <div className="flex flex-col min-h-[100dvh] items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Las fotos aún no se han revelado</h2>
        <p className="text-zinc-400">Vuelve más tarde cuando el organizador revele el álbum.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 p-6 safe-area-pt pb-safe">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center pt-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Álbum Revelado</h1>
          <p className="text-zinc-400">{event.name}</p>
        </header>

        {photos.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            No se tomaron fotos en este evento.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="aspect-[3/4] relative bg-zinc-900 rounded-lg overflow-hidden shadow-lg border border-zinc-800">
                {/* Usamos img en lugar de next/image temporalmente para Base64 con mayor facilidad en idb */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={photo.dataUrl} 
                  alt="Foto del evento" 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
