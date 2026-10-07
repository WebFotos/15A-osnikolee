"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { savePhoto, getSessionPhotos } from "@/lib/storage";
import { X, Loader2, RefreshCw, Images, Sparkles, ZoomIn, SwitchCamera } from "lucide-react";

const MAX_PHOTOS = 24;

export default function CameraPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Iniciando cámara...");

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const [zoomValue, setZoomValue] = useState<number>(1);
  const [digitalZoom, setDigitalZoom] = useState<number>(1);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

  const sessionId = typeof window !== "undefined" ? localStorage.getItem("cd_session") : null;

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
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

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setLoading(true);
    setZoomCapabilities(null);
    setZoomValue(1);
    setDigitalZoom(1);
    setVideoTrack(null);

    let stream: MediaStream | null = null;

    try {
      setCameraStatus(`Solicitando cámara (${facing === "user" ? "frontal" : "trasera"}, 4K)...`);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: facing },
            width: { ideal: 3840, max: 4096 },
            height: { ideal: 2160 },
          },
          audio: false,
        });
        setCameraStatus("Stream asignado (exact)");
      } catch (e1) {
        console.warn("Intento 1 falló:", e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facing,
              width: { ideal: 3840, max: 4096 },
              height: { ideal: 2160 },
            },
            audio: false,
          });
          setCameraStatus("Stream asignado (ideal)");
        } catch (e2) {
          console.warn("Intento 2 falló:", e2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          });
          setCameraStatus("Stream asignado (fallback sin 4K)");
        }
      }

      if (!videoRef.current) {
        setCameraStatus("Error crítico: El elemento de vídeo no se montó en el DOM.");
        setHasPermission(false);
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        setVideoTrack(track);
        const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};

        if (capabilities.zoom) {
          setZoomCapabilities({
            min: capabilities.zoom.min,
            max: capabilities.zoom.max,
            step: capabilities.zoom.step,
          });
          setZoomValue(capabilities.zoom.min || 1);
        }

        if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
          try {
            await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
          } catch (err) {
            console.warn("No se pudo aplicar focusMode continuo", err);
          }
        }
      }

      videoRef.current.onloadedmetadata = () => {
        setCameraStatus("Metadatos cargados, iniciando...");
        videoRef.current
          ?.play()
          .then(() => setCameraStatus("Reproduciendo"))
          .catch((e) => {
            console.error("Error al forzar play:", e);
            setCameraStatus(`Error play: ${e.name}`);
          });
      };

      setHasPermission(true);
    } catch (err: any) {
      console.error("Error getUserMedia:", err);
      setCameraStatus(`Error crítico: ${err.name || err.message}`);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start camera when sessionId or facingMode changes
  useEffect(() => {
    if (!sessionId) return;
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, facingMode]);

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoomValue(val);

    let hardwareZoomSuccess = false;

    if (videoTrack && videoTrack.applyConstraints) {
      try {
        await videoTrack.applyConstraints({ advanced: [{ zoom: val } as any] });
        hardwareZoomSuccess = true;
      } catch {
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
    const rawWidth = video.videoWidth;
    const rawHeight = video.videoHeight;

    let targetWidth = rawWidth;
    let targetHeight = rawHeight;

    if (rawWidth > MAX_WIDTH) {
      targetHeight = Math.floor(rawHeight * (MAX_WIDTH / rawWidth));
      targetWidth = MAX_WIDTH;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (context) {
      if (facingMode === "user") {
        // Mirror horizontally so saved photo matches what user saw
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1);

        if (digitalZoom > 1) {
          const sWidth = rawWidth / digitalZoom;
          const sHeight = rawHeight / digitalZoom;
          const sx = (rawWidth - sWidth) / 2;
          const sy = (rawHeight - sHeight) / 2;
          context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        } else {
          context.drawImage(video, 0, 0, targetWidth, targetHeight);
        }

        context.restore();
      } else {
        if (digitalZoom > 1) {
          const sWidth = rawWidth / digitalZoom;
          const sHeight = rawHeight / digitalZoom;
          const sx = (rawWidth - sWidth) / 2;
          const sy = (rawHeight - sHeight) / 2;
          context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        } else {
          context.drawImage(video, 0, 0, targetWidth, targetHeight);
        }
      }

      setFlash(true);
      setTimeout(() => setFlash(false), 150);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      try {
        await savePhoto(sessionId, dataUrl);
        setPhotoCount((prev) => prev + 1);
      } catch (err: any) {
        alert("Error al guardar: " + (err.message || err.toString() || "Error de red/memoria"));
      }
    }

    setCapturing(false);
  };

  if (!sessionId) return null;

  // Combine transform for video: mirror if front cam, scale if digital zoom
  const videoTransform = (() => {
    const mirror = facingMode === "user" ? "scaleX(-1)" : "scaleX(1)";
    const zoom = digitalZoom > 1 ? `scale(${digitalZoom})` : "";
    return [zoom, mirror].filter(Boolean).join(" ");
  })();

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden flex flex-col z-50">

      {/* OVERLAY DE CARGA */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-forest-deep z-50">
          <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
        </div>
      )}

      {/* OVERLAY DE ERROR DE PERMISOS */}
      {!loading && hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50 bg-forest-deep">
          <h2 className="font-serif text-3xl font-bold text-cream mb-2">Cámara Bloqueada</h2>
          <p className="font-sans text-gold-soft/80 mb-8 text-lg">
            No pudimos acceder a la cámara. Por favor, revisa los permisos de tu navegador.
          </p>
          <p className="font-sans text-red-400 mb-8 text-sm">Estado: {cameraStatus}</p>
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
          onClick={() => router.push("/")}
          className="w-12 h-12 rounded-full bg-forest-deep/80 border border-gold-soft/30 flex items-center justify-center backdrop-blur text-cream shadow-lg"
        >
          <X size={24} />
        </button>

        {/* Toggle camera button */}
        <button
          onClick={handleToggleCamera}
          disabled={loading}
          className="w-12 h-12 rounded-full bg-forest-deep/80 border border-gold-soft/30 flex items-center justify-center backdrop-blur text-cream shadow-lg disabled:opacity-40 transition-all active:scale-95"
        >
          <SwitchCamera size={22} />
        </button>

        <button
          onClick={() => router.push("/mis-fotos")}
          className="px-5 py-2.5 rounded-full bg-forest-deep/80 border border-gold-soft/30 backdrop-blur font-sans font-bold text-gold-soft text-sm flex items-center gap-2 shadow-lg"
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
          style={{
            transform: videoTransform || undefined,
            transformOrigin: "center",
            transition: "transform 0.1s ease-out",
          }}
          className={`absolute w-full h-full object-cover z-0 ${
            !loading && hasPermission ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Flash overlay */}
        {flash && <div className="absolute inset-0 bg-cream z-20 pointer-events-none opacity-80" />}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-40 pb-safe pb-8 pt-24 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end items-center gap-6 pointer-events-none">

        {/* Zoom Slider */}
        {zoomCapabilities && (
          <div className="w-full px-12 mb-4 pointer-events-auto flex items-center gap-3">
            <ZoomIn className="w-5 h-5 text-gold-soft drop-shadow-md" />
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
              ? "border-forest-deep/50 bg-forest-deep/30 opacity-50"
              : "border-gold-warm bg-white/10 active:scale-95 shadow-[0_0_20px_rgba(216,182,90,0.4)]"
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full transition-colors ${
              photoCount >= MAX_PHOTOS ? "bg-forest-deep/50" : "bg-cream"
            }`}
          />
        </button>
      </div>

      {/* Rollo Terminado overlay */}
      {photoCount >= MAX_PHOTOS && (
        <div className="absolute inset-0 z-50 bg-forest-deep/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <Sparkles className="w-16 h-16 text-gold-warm mb-6" />
          <h2 className="font-serif text-4xl font-bold text-cream mb-4">¡Rollo Terminado!</h2>
          <p className="font-sans text-gold-soft/80 mb-10 text-lg">
            Has tomado tus {MAX_PHOTOS} fotografías. Disfruta de la fiesta.
          </p>
          <button
            onClick={() => router.push("/mis-fotos")}
            className="btn-gold px-8 py-4 rounded-2xl font-bold flex items-center gap-2 text-lg"
          >
            Ver mis fotografías
          </button>
        </div>
      )}
    </div>
  );
}
