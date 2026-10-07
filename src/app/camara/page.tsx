"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { savePhoto, getSessionPhotos } from "@/lib/storage";
import { X, Loader2, RefreshCw, Images, Sparkles, ZoomIn } from "lucide-react";

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
  const [cameraStatus, setCameraStatus] = useState("Iniciando cámara...");
  
  const [zoomCapabilities, setZoomCapabilities] = useState<{min: number, max: number, step: number} | null>(null);
  const [zoomValue, setZoomValue] = useState<number>(1);
  const [digitalZoom, setDigitalZoom] = useState<number>(1);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

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
        setCameraStatus("Solicitando permisos (exact environment 4K)...");
        try {
          // Intento 1: Cámara trasera explícita 4K
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: { exact: "environment" },
              width: { ideal: 3840, max: 4096 },
              height: { ideal: 2160 },
            },
            audio: false 
          });
          setCameraStatus("Stream asignado (exact)");
        } catch (e1) {
          console.warn("Intento 1 falló:", e1);
          setCameraStatus("Solicitando permisos (ideal environment 4K)...");
          try {
            // Intento 2: Ideal 4K
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                facingMode: "environment",
                width: { ideal: 3840, max: 4096 },
                height: { ideal: 2160 },
              },
              audio: false 
            });
            setCameraStatus("Stream asignado (ideal)");
          } catch (e2) {
            console.warn("Intento 2 falló:", e2);
            setCameraStatus("Solicitando permisos (cualquier cámara)...");
            // Intento 3: Cualquier cámara, resolucion default
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: true,
              audio: false 
            });
            setCameraStatus("Stream asignado (fallback)");
          }
        }
        
        if (!videoRef.current) {
          setCameraStatus("Error crítico: El elemento de vídeo no se montó en el DOM.");
          setHasPermission(false);
          return;
        }

        if (stream) {
          videoRef.current.srcObject = stream;
          
          const track = stream.getVideoTracks()[0];
          if (track) {
            setVideoTrack(track);
            const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
            
            if (capabilities.zoom) {
              setZoomCapabilities({ 
                min: capabilities.zoom.min, 
                max: capabilities.zoom.max, 
                step: capabilities.zoom.step 
              });
              setZoomValue(capabilities.zoom.min || 1);
            }
            
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              try {
                await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
              } catch (err) {
                console.warn("No se pudo aplicar focusMode continuo", err);
              }
            }
          }

          videoRef.current.onloadedmetadata = () => {
            setCameraStatus("Metadatos cargados, forzando play...");
            videoRef.current?.play()
              .then(() => setCameraStatus("Reproduciendo"))
              .catch(e => {
                console.error("Error al forzar play:", e);
                setCameraStatus(`Error play: ${e.name}`);
              });
          };
          setHasPermission(true);
        }
      } catch (err: any) {
        console.error("Error getUserMedia general:", err);
        setCameraStatus(`Error crítico: ${err.name || err.message}`);
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

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoomValue(val);
    
    let hardwareZoomSuccess = false;

    if (videoTrack && videoTrack.applyConstraints) {
      try {
        await videoTrack.applyConstraints({ advanced: [{ zoom: val } as any] });
        hardwareZoomSuccess = true;
      } catch (err) {
        try {
          await videoTrack.applyConstraints({ zoom: val } as any);
          hardwareZoomSuccess = true;
        } catch (e2) {
          console.warn("Hardware zoom no soportado activamente", e2);
        }
      }
    }

    if (!hardwareZoomSuccess) {
      setDigitalZoom(val);
    } else {
      setDigitalZoom(1);
    }
  };

  const takePhoto = async () => {
    if (photoCount >= MAX_PHOTOS || capturing) return;
    if (!videoRef.current || !canvasRef.current || !sessionId) return;

    setCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const MAX_WIDTH = 1920;
    let rawWidth = video.videoWidth;
    let rawHeight = video.videoHeight;
    
    let targetWidth = rawWidth;
    let targetHeight = rawHeight;
    
    if (rawWidth > MAX_WIDTH) {
      targetHeight = Math.floor(rawHeight * (MAX_WIDTH / rawWidth));
      targetWidth = MAX_WIDTH;
    }
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      if (digitalZoom > 1) {
        // Crop the center for digital zoom
        const sWidth = rawWidth / digitalZoom;
        const sHeight = rawHeight / digitalZoom;
        const sx = (rawWidth - sWidth) / 2;
        const sy = (rawHeight - sHeight) / 2;
        
        context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      } else {
        context.drawImage(video, 0, 0, targetWidth, targetHeight);
      }
      
      setFlash(true);
      setTimeout(() => setFlash(false), 150);

      // Usar calidad JPEG 0.85
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      try {
        await savePhoto(sessionId, dataUrl);
        setPhotoCount(prev => prev + 1);
      } catch (err: any) {
        alert("Error al guardar: " + (err.message || err.toString() || "Error de red/memoria"));
      }
    }
    
    setCapturing(false);
  };

  if (!sessionId) return null;

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden flex flex-col z-50">
      
      {/* OVERLAY DE CARGA */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#e2f1e4] z-50">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A261D]" />
        </div>
      )}

      {/* OVERLAY DE ERROR DE PERMISOS */}
      {!loading && hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50 bg-forest-deep">
          <h2 className="font-serif text-3xl font-bold text-[#0A261D] mb-2">Cámara Bloqueada</h2>
          <p className="font-sans text-[#0A261D]/80 mb-8 text-lg">
            No pudimos acceder a la cámara. Por favor, revisa los permisos de tu navegador.
          </p>
          <p className="font-sans text-red-400 mb-8 text-sm">Estado interno: {cameraStatus}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-gold px-8 py-4 rounded-2xl font-bold flex items-center gap-2"
          >
            <RefreshCw size={20} /> Reintentar
          </button>
        </div>
      )}

      {/* Debug Status */}
      <div className="absolute top-16 right-4 z-[60] bg-black/60 text-white text-xs px-2 py-1 rounded font-mono">
        {cameraStatus}
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 safe-area-pt bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => router.push(`/`)}
          className="w-12 h-12 rounded-full bg-forest-deep/80 border border-gold-soft/30 flex items-center justify-center backdrop-blur text-cream shadow-lg"
        >
          <X size={24} />
        </button>

        <button 
          onClick={() => router.push(`/mis-fotos`)}
          className="px-5 py-2.5 rounded-full bg-forest-deep/80 border border-gold-soft/30 backdrop-blur font-sans font-bold text-[#E7CC82] text-sm flex items-center gap-2 shadow-lg"
        >
          <Images size={18} />
          Mis Fotos
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={digitalZoom > 1 ? { transform: `scale(${digitalZoom})`, transformOrigin: 'center', transition: 'transform 0.1s ease-out' } : undefined}
          className={`absolute w-full h-full object-cover z-0 ${(!loading && hasPermission) ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-cream z-20 pointer-events-none opacity-80" />
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-40 pb-safe pb-8 pt-24 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end items-center gap-6 pointer-events-none">
        
        {/* Zoom Slider (Only visible if hardware supports it) */}
        {zoomCapabilities && (
          <div className="w-full px-12 mb-4 pointer-events-auto flex items-center gap-3">
            <ZoomIn className="w-5 h-5 text-[#0A261D] drop-shadow-md" />
            <input 
              type="range" 
              min={zoomCapabilities.min} 
              max={zoomCapabilities.max} 
              step={zoomCapabilities.step} 
              value={zoomValue} 
              onChange={handleZoomChange}
              className="w-full accent-gold-warm h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Counter */}
        <div className="font-sans font-bold text-cream/90 tracking-widest text-sm bg-black/40 px-4 py-1.5 rounded-full backdrop-blur border border-white/10 shadow-lg pointer-events-auto">
          {photoCount} / {MAX_PHOTOS} FOTOS
        </div>

        {/* Shutter Button */}
        <button
          onClick={takePhoto}
          disabled={photoCount >= MAX_PHOTOS || capturing}
          className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all shadow-xl pointer-events-auto ${
            photoCount >= MAX_PHOTOS 
              ? 'border-forest-deep/50 bg-forest-deep/30 opacity-50' 
              : 'border-gold-warm bg-white/10 active:scale-95 shadow-[0_0_20px_rgba(216,182,90,0.4)]'
          }`}
        >
          <div className={`w-20 h-20 rounded-full transition-colors ${photoCount >= MAX_PHOTOS ? 'bg-forest-deep/50' : 'bg-cream'}`} />
        </button>
      </div>
      
      {photoCount >= MAX_PHOTOS && (
        <div className="absolute inset-0 z-50 bg-[#e2f1e4]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <Sparkles className="w-16 h-16 text-gold-warm mb-6" />
          <h2 className="font-serif text-4xl font-bold text-[#0A261D] mb-4">¡Rollo Terminado!</h2>
          <p className="font-sans text-[#0A261D]/80 mb-10 text-lg">Has tomado tus {MAX_PHOTOS} fotografías. Disfruta de la fiesta.</p>
          
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
