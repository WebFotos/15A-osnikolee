"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEvent, savePhoto, getSessionPhotosCount } from "@/lib/storage";
import { Camera, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { use } from "react";

const MAX_PHOTOS = 24;

export default function CameraPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(false);

  const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem(`session_${eventId}`) : null;

  useEffect(() => {
    if (!sessionId) {
      router.replace(`/evento/${eventId}`);
      return;
    }

    async function checkStatus() {
      try {
        const ev = await getEvent(eventId);
        if (!ev || ev.status !== 'ACTIVE' && ev.status !== 'DRAFT') {
          router.replace(`/evento/${eventId}`);
          return;
        }

        const count = await getSessionPhotosCount(sessionId!);
        setPhotoCount(count);
      } catch (err) {
        setError("Error al cargar datos.");
      }
    }
    
    checkStatus();
  }, [eventId, router, sessionId]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: "environment" } },
          audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setHasPermission(true);
      } catch (err) {
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
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Simulate flash
      setFlash(true);
      setTimeout(() => setFlash(false), 150);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      try {
        await savePhoto(eventId, sessionId, dataUrl);
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
      <div className="flex h-[100dvh] items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-black p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Cámara Bloqueada</h2>
        <p className="text-zinc-400 mb-6">Necesitamos acceso a la cámara para que puedas tomar fotos.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white text-black px-6 py-3 rounded-full font-semibold flex items-center gap-2"
        >
          <RefreshCw size={20} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 safe-area-pt bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => router.push(`/evento/${eventId}`)}
          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur text-white"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="px-4 py-1.5 rounded-full bg-black/50 backdrop-blur font-mono font-bold text-white tracking-widest text-lg">
          {photoCount} / {MAX_PHOTOS}
        </div>
        
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative w-full h-full">
        <video 
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-white z-20 pointer-events-none" />
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe pb-8 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center items-center">
        <button
          onClick={takePhoto}
          disabled={photoCount >= MAX_PHOTOS || capturing}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
            photoCount >= MAX_PHOTOS 
              ? 'border-zinc-700 bg-zinc-800 opacity-50' 
              : 'border-white bg-white/20 active:bg-white/40 active:scale-95'
          }`}
        >
          <div className={`w-16 h-16 rounded-full ${photoCount >= MAX_PHOTOS ? 'bg-zinc-600' : 'bg-white'}`} />
        </button>
      </div>
      
      {photoCount >= MAX_PHOTOS && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur flex flex-col items-center justify-center p-6 text-center">
          <Camera size={64} className="text-zinc-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">¡Rollo Terminado!</h2>
          <p className="text-zinc-400 mb-8">Has tomado tus {MAX_PHOTOS} fotos. Espera a que se revelen.</p>
        </div>
      )}
    </div>
  );
}
