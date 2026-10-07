"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionPhotos } from "@/lib/storage";
import { PhotoWithUrl } from "@/lib/types";
import { Loader2, ArrowLeft, Image as ImageIcon, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

export default function MisFotosPage() {
  const router = useRouter();

  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const sessionId = localStorage.getItem(`cd_session`);
    if (!sessionId) {
      router.replace("/");
      return;
    }

    async function load() {
      try {
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

  const openPhoto = (index: number) => {
    setSelectedIndex(index);
    setZoom(1);
  };

  const closePhoto = () => {
    setSelectedIndex(null);
    setZoom(1);
  };

  const goPrev = useCallback(() => {
    if (selectedIndex === null) return;
    setZoom(1);
    setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
  }, [selectedIndex, photos.length]);

  const goNext = useCallback(() => {
    if (selectedIndex === null) return;
    setZoom(1);
    setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1);
  }, [selectedIndex, photos.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") closePhoto();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedIndex, goPrev, goNext]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center relative z-10">
        <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
      </div>
    );
  }

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

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
        <div className="w-12" />
      </header>

      {photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <ImageIcon className="w-16 h-16 text-cream/50 mb-4" />
          <p className="font-sans text-cream/70 text-lg">Aún no has tomado ninguna fotografía.</p>
          <button
            onClick={() => router.push("/camara")}
            className="mt-8 btn-gold px-8 py-3 rounded-2xl font-bold font-sans"
          >
            Ir a la cámara
          </button>
        </div>
      ) : (
        <>
          <p className="font-sans text-cream/70 text-sm mb-4 text-right">
            {photos.length} / 24 fotos
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => openPhoto(index)}
                className="aspect-[3/4] relative bg-forest-deep/50 rounded-xl overflow-hidden border border-gold-soft/20 shadow-md cursor-pointer hover:border-gold-warm hover:scale-[1.02] transition-all duration-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Mi foto"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {photos.length > 0 && (
            <div className="mt-10 text-center pb-8">
              <p className="font-serif text-cream text-base mb-1">Tus recuerdos están seguros ✨</p>
              <p className="font-sans text-cream/50 text-sm">Toca cualquier foto para verla en grande.</p>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {selectedPhoto && selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/97 backdrop-blur-md flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 safe-area-pt">
            <span className="font-sans text-white/50 text-sm">
              {selectedIndex + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom(z => Math.max(1, z - 0.5))}
                disabled={zoom <= 1}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={() => setZoom(z => Math.min(4, z + 0.5))}
                disabled={zoom >= 4}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={closePhoto}
                className="w-10 h-10 rounded-full bg-forest-deep border border-gold-soft/30 flex items-center justify-center text-[#FFF7E6] ml-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Photo Container */}
          <div className="flex-1 relative flex items-center justify-center overflow-auto touch-pinch-zoom px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto.url}
              alt="Mi foto ampliada"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-6 pb-safe">
            <button
              onClick={goPrev}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95"
            >
              <ChevronLeft size={28} />
            </button>

            <div className="flex gap-1.5">
              {photos.slice(Math.max(0, selectedIndex - 2), Math.min(photos.length, selectedIndex + 3)).map((_, i) => {
                const realIndex = Math.max(0, selectedIndex - 2) + i;
                return (
                  <div
                    key={realIndex}
                    onClick={() => openPhoto(realIndex)}
                    className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${realIndex === selectedIndex ? 'bg-gold-warm' : 'bg-white/30'}`}
                  />
                );
              })}
            </div>

            <button
              onClick={goNext}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
