"use client";

import { useEffect, useState } from "react";
import { getAllPhotos, getEventStatus } from "@/lib/storage";
import { Photo, EventStatus, EVENT_DETAILS } from "@/lib/types";
import { Loader2, ArrowLeft, X } from "lucide-react";
import Link from "next/link";

export default function AlbumPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<EventStatus>('PRIVATE');
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    async function loadAlbum() {
      try {
        const evStatus = await getEventStatus();
        setStatus(evStatus);

        if (evStatus === 'REVEALED') {
          const allPhotos = await getAllPhotos();
          // Reverse to show newest first, or just leave as is
          setPhotos(allPhotos.reverse());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAlbum();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center relative z-10">
        <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
      </div>
    );
  }

  if (status !== 'REVEALED') {
    return (
      <div className="flex flex-col min-h-[100dvh] items-center justify-center p-6 text-center relative z-10">
        <h2 className="font-serif text-3xl font-bold text-gold-warm mb-4">El álbum está cerrado</h2>
        <p className="font-sans text-cream/80 text-lg mb-8">Vuelve más tarde cuando los recuerdos de la noche sean revelados.</p>
        <Link href="/" className="btn-gold px-8 py-3 rounded-2xl font-bold font-sans">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-6 safe-area-pt pb-safe relative z-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center pt-8">
          <p className="font-script text-3xl text-gold-soft mb-1">{EVENT_DETAILS.name}</p>
          <h1 className="font-serif text-5xl font-bold text-cream mb-4">{EVENT_DETAILS.protagonist}</h1>
          <p className="font-sans text-cream/60 tracking-widest text-sm uppercase">
            {EVENT_DETAILS.location} &middot; {EVENT_DETAILS.date}
          </p>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-gold-warm to-transparent mx-auto mt-6" />
        </header>

        {photos.length === 0 ? (
          <div className="text-center text-gold-soft/50 py-12 font-sans text-lg">
            Aún no hay fotografías en el álbum.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div 
                key={photo.id} 
                onClick={() => setSelectedPhoto(photo)}
                className="aspect-[3/4] relative bg-forest-deep/80 rounded-xl overflow-hidden shadow-lg border border-gold-soft/20 cursor-pointer hover:border-gold-warm transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={photo.dataUrl} 
                  alt="Recuerdo" 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 safe-area-pt pb-safe">
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="w-12 h-12 rounded-full bg-forest-deep border border-gold-soft/30 flex items-center justify-center text-cream"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={selectedPhoto.dataUrl} 
              alt="Recuerdo ampliado" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
