"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { savePhoto, getSessionPhotos, getEventStatus } from "@/lib/storage";
import { X, Loader2, RefreshCw, Images, Sparkles } from "lucide-react";

const MAX_PHOTOS = 24;

export default function CameraPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  const sessionId = typeof window !== 'undefined' ? localStorage.getItem(`cd_session`) : null;

  useEffect(() => {
    if (!sessionId) {
      router.replace(`/`);
      return;
    }

    async function checkStatus() {
      try {
        const photos = await getSessionPhotos(sessionId!);
        setPhotoCount(photos.length);
        
        // If event is revealed, maybe redirect to album or show a banner? 
        // We'll just let them know or let them take photos if they want, but the requirement 
        // doesn't say taking photos is blocked after reveal.
      } catch (err) {
        console.error(err);
      }
    }
    
    checkStatus();
  }, [router, sessionId]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: "environment" } },
            audio: false 
          });
        } catch (fallbackErr) {
          console.warn("Fallo con facingMode, intentando sin constraints:", fallbackErr);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
          });
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Error al forzar play:", e));
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Error getUserMedia:", err);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId]);

  const takePhoto = async () => {
    if (photoCount >= MAX_PHOTOS || capturing) return;
    if (!videoRef.current || !canvasRef.current || !sessionId) return;

    setCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      setFlash(true);
      setTimeout(() => setFlash(false), 150);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      try {
        await savePhoto(sessionId, dataUrl);
        setPhotoCount(prev => prev + 1);
      } catch (err: any) {
        alert(err.message || "Error al guardar foto");
      }
    }
    
    setCapturing(false);
  };

  if (!sessionId) return null;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-forest-deep z-50 absolute inset-0">
        <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col min-h-[100dvh] items-center justify-center p-6 text-center z-10 relative">
        <h2 className="font-serif text-3xl font-bold text-cream mb-2">Cámara Bloqueada</h2>
        <p className="font-sans text-gold-soft/80 mb-8 text-lg">
          No pudimos acceder a la cámara. Por favor, revisa los permisos de tu navegador.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-gold px-8 py-4 rounded-2xl font-bold flex items-center gap-2"
        >
          <RefreshCw size={20} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden flex flex-col z-50">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 safe-area-pt bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => router.push(`/`)}
          className="w-12 h-12 rounded-full bg-forest-deep/80 border border-gold-soft/30 flex items-center justify-center backdrop-blur text-cream shadow-lg"
        >
          <X size={24} />
        </button>

        <button 
          onClick={() => router.push(`/mis-fotos`)}
          className="px-5 py-2.5 rounded-full bg-forest-deep/80 border border-gold-soft/30 backdrop-blur font-sans font-bold text-gold-soft text-sm flex items-center gap-2 shadow-lg"
        >
          <Images size={18} />
          Mis Fotos
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative w-full h-full">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-cream z-20 pointer-events-none opacity-80" />
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe pb-8 pt-16 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-center items-center gap-6">
        
        {/* Counter */}
        <div className="font-sans font-bold text-cream/90 tracking-widest text-sm bg-black/40 px-4 py-1.5 rounded-full backdrop-blur border border-white/10">
          {photoCount} / {MAX_PHOTOS} FOTOS
        </div>

        {/* Shutter Button */}
        <button
          onClick={takePhoto}
          disabled={photoCount >= MAX_PHOTOS || capturing}
          className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${
            photoCount >= MAX_PHOTOS 
              ? 'border-forest-deep/50 bg-forest-deep/30 opacity-50' 
              : 'border-gold-warm bg-white/10 active:scale-95 shadow-[0_0_20px_rgba(216,182,90,0.4)]'
          }`}
        >
          <div className={`w-20 h-20 rounded-full transition-colors ${photoCount >= MAX_PHOTOS ? 'bg-forest-deep/50' : 'bg-cream'}`} />
        </button>
      </div>
      
      {photoCount >= MAX_PHOTOS && (
        <div className="absolute inset-0 z-30 bg-forest-deep/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <Sparkles className="w-16 h-16 text-gold-warm mb-6" />
          <h2 className="font-serif text-4xl font-bold text-cream mb-4">¡Rollo Terminado!</h2>
          <p className="font-sans text-gold-soft/80 mb-10 text-lg">Has tomado tus {MAX_PHOTOS} fotografías. Disfruta de la fiesta.</p>
          
          <button 
            onClick={() => router.push(`/mis-fotos`)}
            className="btn-gold px-8 py-4 rounded-2xl font-bold flex items-center gap-2 text-lg"
          >
            Ver mis fotografías
          </button>
        </div>
      )}
    </div>
  );
}
