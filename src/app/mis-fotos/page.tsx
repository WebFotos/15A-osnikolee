"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionPhotos, deletePhoto, downloadPhoto, getEventStatus } from "@/lib/storage";
import { PhotoWithUrl } from "@/lib/types";
import { 
  Loader2, 
  ArrowLeft, 
  Image as ImageIcon, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function MisFotosPage() {
  const router = useRouter();

  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isAlbumClosed, setIsAlbumClosed] = useState(false);

  // Deletion & Download states
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithUrl | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    const sessionId = localStorage.getItem(`cd_session`);
    if (!sessionId) {
      router.replace("/");
      return;
    }

    async function load() {
      try {
        const [myPhotos, status] = await Promise.all([
          getSessionPhotos(sessionId!),
          getEventStatus().catch(() => "PRIVATE" as const)
        ]);

        setPhotos(myPhotos);
        setIsAlbumClosed(status === "REVEALED");
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

  // Handle single photo download
  const handleDownloadSingle = async (photo: PhotoWithUrl, index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!photo.url) return;

    setDownloadingId(photo.id);
    try {
      await downloadPhoto(photo.url, `foto_15_nikolee_${index + 1}.jpg`);
      showToast("Fotografía descargada en tu dispositivo 📥", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al descargar la fotografía", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle download all user photos as zip
  const handleDownloadAll = async () => {
    if (photos.length === 0 || downloadingAll) return;
    setDownloadingAll(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder("mis_fotos_15_nikolee");

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (!photo.url) continue;

        try {
          const res = await fetch(photo.url);
          const blob = await res.blob();
          folder?.file(`recuerdo_${i + 1}.jpg`, blob);
        } catch (fetchErr) {
          console.warn(`No se pudo descargar la foto ${i + 1}:`, fetchErr);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "mis_recuerdos_15_nikolee.zip");
      showToast("¡Todas tus fotos se han descargado! 🎁", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al preparar la descarga de tus fotos", "error");
    } finally {
      setDownloadingAll(false);
    }
  };

  // Confirm delete of a photo
  const confirmDelete = async () => {
    if (!photoToDelete) return;
    if (isAlbumClosed) {
      showToast("El álbum ya fue cerrado por el administrador. No se pueden borrar fotos.", "error");
      setPhotoToDelete(null);
      return;
    }

    setDeletingId(photoToDelete.id);
    try {
      await deletePhoto(photoToDelete.id);

      // Remove from local list
      const updated = photos.filter((p) => p.id !== photoToDelete.id);
      setPhotos(updated);

      // Adjust lightbox index if open
      if (selectedIndex !== null) {
        if (updated.length === 0) {
          setSelectedIndex(null);
        } else if (selectedIndex >= updated.length) {
          setSelectedIndex(updated.length - 1);
        }
      }

      showToast("Fotografía eliminada. ¡Has recuperado 1 espacio! ✨", "success");
      setPhotoToDelete(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al eliminar la fotografía", "error");
    } finally {
      setDeletingId(null);
    }
  };

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
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] max-w-sm w-[90%] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-sm font-sans font-semibold flex items-center gap-2.5 ${
              toast.type === "success"
                ? "bg-forest-deep/95 border-gold-soft/60 text-cream"
                : "bg-red-950/95 border-red-500/60 text-red-100"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="text-gold-warm flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push(`/camara`)}
          className="w-12 h-12 rounded-full bg-forest-deep/50 border border-gold-soft/30 flex items-center justify-center backdrop-blur text-cream active:scale-95 transition-transform"
          aria-label="Volver a la cámara"
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
            className="mt-8 btn-gold px-8 py-3 rounded-2xl font-bold font-sans active:scale-95 transition-transform"
          >
            Ir a la cámara
          </button>
        </div>
      ) : (
        <>
          {/* Top Info & Batch Actions */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-cream/90 text-sm bg-black/40 px-3.5 py-1.5 rounded-full border border-gold-soft/20 backdrop-blur-sm">
                  {photos.length} / 24 fotos
                </span>

                {isAlbumClosed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold bg-gold-warm/15 text-gold-warm border border-gold-warm/30 px-3 py-1 rounded-full">
                    <Lock size={12} /> Álbum finalizado
                  </span>
                ) : (
                  <span className="text-xs text-cream/60 font-sans">
                    Puedes borrar fotos para recuperar espacio
                  </span>
                )}
              </div>

              {photos.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="btn-gold px-3.5 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                  title="Descargar todas mis fotos en un archivo .zip"
                >
                  {downloadingAll ? (
                    <Loader2 size={13} className="animate-spin text-forest-deep" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>Descargar todas</span>
                </button>
              )}
            </div>

            {isAlbumClosed && (
              <div className="bg-forest-deep/60 border border-gold-soft/30 rounded-2xl p-3 text-center text-xs text-gold-soft/90 backdrop-blur-sm flex items-center justify-center gap-2">
                <Lock size={14} className="flex-shrink-0" />
                <span>
                  El administrador ha cerrado el álbum para el revelado final. Tus fotos se conservan para el recuerdo y ya no se pueden borrar.
                </span>
              </div>
            )}
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => openPhoto(index)}
                className="aspect-[3/4] relative bg-forest-deep/50 rounded-2xl overflow-hidden border border-gold-soft/20 shadow-md cursor-pointer hover:border-gold-warm hover:scale-[1.02] transition-all duration-200 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Mi foto ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Corner indicator / quick badge */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-cream/90 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border border-white/10">
                  #{index + 1}
                </div>

                {/* Quick actions overlay */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
                  <button
                    onClick={(e) => handleDownloadSingle(photo, index, e)}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-cream hover:text-gold-warm active:scale-90 transition-all shadow-md"
                    title="Descargar esta foto"
                    aria-label="Descargar esta foto"
                  >
                    <Download size={14} />
                  </button>
                  {!isAlbumClosed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDelete(photo);
                      }}
                      className="w-8 h-8 rounded-full bg-red-950/70 backdrop-blur border border-red-500/40 flex items-center justify-center text-red-200 hover:text-white active:scale-90 transition-all shadow-md"
                      title="Borrar esta foto"
                      aria-label="Borrar esta foto"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {photos.length > 0 && (
            <div className="mt-10 text-center pb-8">
              <p className="font-serif text-cream text-base mb-1">Tus recuerdos están seguros ✨</p>
              <p className="font-sans text-cream/50 text-sm">
                Toca cualquier foto para verla en pantalla completa, guardarla en tu teléfono o eliminarla si no te gustó.
              </p>
            </div>
          )}
        </>
      )}

      {/* Lightbox (Full screen preview) */}
      {selectedPhoto && selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/97 backdrop-blur-md flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 safe-area-pt">
            <span className="font-sans text-white/70 text-sm font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/10">
              {selectedIndex + 1} / {photos.length}
            </span>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                disabled={zoom <= 1}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 active:scale-95"
                title="Alejar"
                aria-label="Alejar foto"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                disabled={zoom >= 4}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 active:scale-95"
                title="Acercar"
                aria-label="Acercar foto"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={closePhoto}
                className="w-10 h-10 rounded-full bg-forest-deep border border-gold-soft/40 flex items-center justify-center text-[#FFF7E6] ml-2 active:scale-95 shadow-md"
                aria-label="Cerrar vista previa"
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
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                transition: "transform 0.2s",
              }}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          </div>

          {/* Action buttons (Download & Delete) */}
          <div className="flex items-center justify-center gap-3 px-6 py-2.5">
            {/* Download single photo */}
            <button
              onClick={() => handleDownloadSingle(selectedPhoto, selectedIndex)}
              disabled={downloadingId === selectedPhoto.id}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-forest-deep/90 border border-gold-soft/50 text-gold-soft hover:text-cream hover:border-gold-warm transition-all text-sm font-sans font-bold shadow-lg active:scale-95"
              aria-label="Guardar en mi teléfono"
            >
              {downloadingId === selectedPhoto.id ? (
                <Loader2 size={16} className="animate-spin text-gold-soft" />
              ) : (
                <Download size={16} />
              )}
              <span>Guardar en mi móvil</span>
            </button>

            {/* Delete photo if not closed */}
            {!isAlbumClosed ? (
              <button
                onClick={() => setPhotoToDelete(selectedPhoto)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-950/60 border border-red-500/50 text-red-200 hover:text-white hover:bg-red-900/60 transition-all text-sm font-sans font-bold shadow-lg active:scale-95"
                aria-label="Borrar fotografía"
              >
                <Trash2 size={16} />
                <span>Borrar</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-sans">
                <Lock size={13} />
                <span>Álbum cerrado</span>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between p-6 pb-safe">
            <button
              onClick={goPrev}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95 shadow-md"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={28} />
            </button>

            <div className="flex gap-1.5">
              {photos
                .slice(Math.max(0, selectedIndex - 2), Math.min(photos.length, selectedIndex + 3))
                .map((_, i) => {
                  const realIndex = Math.max(0, selectedIndex - 2) + i;
                  return (
                    <div
                      key={realIndex}
                      onClick={() => openPhoto(realIndex)}
                      className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                        realIndex === selectedIndex ? "bg-gold-warm w-4" : "bg-white/30"
                      }`}
                    />
                  );
                })}
            </div>

            <button
              onClick={goNext}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95 shadow-md"
              aria-label="Foto siguiente"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Photo */}
      {photoToDelete && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-forest-deep border-2 border-gold-soft/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center mx-auto mb-4 text-red-300 shadow-inner">
              <Trash2 size={28} />
            </div>

            <h3 className="font-serif text-2xl font-bold text-cream mb-2">
              ¿Eliminar esta foto?
            </h3>

            <p className="font-sans text-cream/70 text-sm mb-6 leading-relaxed">
              Si no te gustó cómo quedó, puedes borrarla ahora. Se liberará 1 espacio para que puedas tomar una nueva fotografía.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-sans font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {deletingId ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Sí, eliminar fotografía</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setPhotoToDelete(null)}
                disabled={deletingId !== null}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-cream font-sans font-semibold border border-white/10 active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
