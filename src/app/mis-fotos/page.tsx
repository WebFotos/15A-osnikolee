"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionPhotos, getEventStatus } from "@/lib/storage";
import { Photo, EventStatus } from "@/lib/types";
import { Loader2, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default function MisFotosPage() {
  const router = useRouter();
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<EventStatus>('PRIVATE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem(`cd_session`);
    if (!sessionId) {
      router.replace("/");
      return;
    }

    async function load() {
      try {
        const evStatus = await getEventStatus();
        setStatus(evStatus);
        
        const myPhotos = await getSessionPhotos(sessionId!);
        setPhotos(myPhotos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center relative z-10">
        <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-6 safe-area-pt pb-safe relative z-10 flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.push(`/camara`)}
          className="w-12 h-12 rounded-full bg-forest-deep/50 border border-gold-soft/30 flex items-center justify-center backdrop-blur text-cream"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-serif text-2xl font-bold text-cream">Mis fotografías</h1>
        <div className="w-12" /> {/* Spacer */}
      </header>

      {status === 'REVEALED' && (
        <div className="mb-8 bg-forest-deep/80 border border-gold-warm/50 rounded-2xl p-6 text-center backdrop-blur shadow-xl">
          <h2 className="font-serif text-xl text-gold-warm font-bold mb-2">✨ ¡El álbum está listo! ✨</h2>
          <p className="font-sans text-cream/80 text-sm mb-4">
            Descubre todos los momentos capturados durante esta noche.
          </p>
          <Link href="/album" className="btn-gold inline-block w-full py-3 rounded-xl font-bold font-sans">
            VER ÁLBUM COMPLETO
          </Link>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <ImageIcon className="w-16 h-16 text-gold-soft/30 mb-4" />
          <p className="font-sans text-gold-soft/60 text-lg">Aún no has tomado ninguna fotografía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="aspect-[3/4] relative bg-forest-deep/50 rounded-xl overflow-hidden border border-gold-soft/20 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={photo.dataUrl} 
                alt="Mi foto" 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {status === 'PRIVATE' && photos.length > 0 && (
        <div className="mt-12 text-center pb-8">
          <p className="font-serif text-gold-warm text-lg mb-2">Las fotografías están guardadas...</p>
          <p className="font-sans text-cream/60 text-sm">Pronto podrás descubrir todos los recuerdos de esta noche en el álbum final.</p>
        </div>
      )}
    </div>
  );
}
