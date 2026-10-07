"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllPhotos } from "@/lib/storage";
import { EVENT_DETAILS, PhotoWithUrl } from "@/lib/types";
import { Loader2, ArrowLeft, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";

export default function AdminAlbumPage() {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    async function loadAlbum() {
      try {
        const res = await fetch('/api/admin/photos');
        if (res.ok) {
          const allPhotos = await res.json();
          setPhotos(allPhotos);
        } else {
          console.error("Error fetching photos", await res.text());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAlbum();
  }, []);

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

  // Keyboard navigation
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
        <Loader2 className="w-8 h-8 animate-spin text-cream" />
      </div>
    );
  }

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <div className="min-h-[100dvh] p-6 safe-area-pt pb-safe relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8 pt-4">
          <Link
            href="/admin"
            className="w-12 h-12 rounded-full bg-forest-deep/50 border border-gold-soft/30 flex items-center justify-center backdrop-blur text-cream"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <p className="font-script text-xl text-cream">{EVENT_DETAILS.name}</p>
            <h1 className="font-serif text-2xl font-bold text-cream">Álbum Completo</h1>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="text-center text-cream/50 py-20 font-sans text-lg">
            Aún no hay fotografías. ¡Los invitados están capturando recuerdos!
          </div>
        ) : (
          <>
            <p className="font-sans text-cream/60 text-sm mb-6 text-right">
              {photos.length} {photos.length === 1 ? "fotografía" : "fotografías"}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => openPhoto(index)}
                  className="aspect-[3/4] relative bg-forest-deep/80 rounded-xl overflow-hidden shadow-lg border border-gold-soft/20 cursor-pointer hover:border-gold-warm hover:scale-[1.02] transition-all duration-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Recuerdo"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
                className="w-10 h-10 rounded-full bg-forest-deep border border-gold-soft/30 flex items-center justify-center text-cream ml-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Photo Container - overflow for pinch-to-zoom */}
          <div className="flex-1 relative flex items-center justify-center overflow-auto touch-pinch-zoom px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto.url}
              alt="Recuerdo ampliado"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Navigation Arrows */}
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
