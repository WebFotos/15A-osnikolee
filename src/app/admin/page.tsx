"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EVENT_DETAILS } from "@/lib/types";
import { Loader2, QrCode, Camera, Users, ArrowLeft, RefreshCw, Images, Download } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface SessionRow {
  id: string;
  guest_name: string;
  photo_count: number;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [photoCount, setPhotoCount] = useState(0);
  const [sessionsData, setSessionsData] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionsRes = await fetch("/api/admin/sessions");
      if (sessionsRes.ok) {
        const sessions: SessionRow[] = await sessionsRes.json();
        setSessionsData(sessions);
        setPhotoCount(sessions.reduce((acc, s) => acc + s.photo_count, 0));
      }
    } catch (err) {
      console.error("Error al cargar datos del admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      
      const res = await fetch("/api/admin/photos");
      if (!res.ok) throw new Error("Error al obtener urls de fotos");
      
      const photos = await res.json();
      if (!photos || photos.length === 0) {
        alert("No hay fotografías para descargar.");
        setDownloading(false);
        return;
      }

      setDownloadProgress({ current: 0, total: photos.length });

      const zip = new JSZip();
      const folder = zip.folder("15_Anos_Nikolee_Fotos");

      const CONCURRENCY = 5;
      let completed = 0;
      
      for (let i = 0; i < photos.length; i += CONCURRENCY) {
        const batch = photos.slice(i, i + CONCURRENCY);
        
        await Promise.all(
          batch.map(async (photo: any) => {
            try {
              const imgRes = await fetch(photo.url);
              if (!imgRes.ok) throw new Error(`HTTP error! status: ${imgRes.status}`);
              const blob = await imgRes.blob();
              
              const guestName = photo.guest_sessions?.guest_name || "invitado";
              const filename = `${guestName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${photo.id.substring(0, 8)}.jpg`;
                
              folder?.file(filename, blob);
            } catch (err) {
              console.error(`Error descargando foto ${photo.id}:`, err);
            } finally {
              completed++;
              setDownloadProgress(prev => ({ ...prev, current: completed }));
            }
          })
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "15_Anos_Nikolee_Todas_Las_Fotos.zip");
      
    } catch (err) {
      console.error(err);
      alert("Hubo un error al crear el archivo ZIP.");
    } finally {
      setDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center relative z-10">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A261D]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-6 safe-area-pt relative z-10">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center text-[#0A261D] hover:text-gold-warm font-sans">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a la portada
          </Link>
          <button
            onClick={loadData}
            className="w-10 h-10 rounded-full bg-forest-deep/50 border border-gold-soft/20 flex items-center justify-center text-[#0A261D] hover:text-gold-warm"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="bg-forest-deep/80 border border-gold-soft/30 rounded-3xl p-8 mb-8 backdrop-blur shadow-xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="font-script text-2xl text-[#0A261D] mb-1">{EVENT_DETAILS.name}</p>
              <h1 className="font-serif text-3xl font-bold mb-2 text-[#0A261D]">{EVENT_DETAILS.protagonist}</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/20 border border-gold-soft/20 p-6 rounded-2xl flex flex-col items-center justify-center">
              <Camera className="w-8 h-8 text-[#0A261D] mb-3" />
              <span className="font-serif text-4xl font-bold text-[#0A261D]">{photoCount}</span>
              <span className="font-sans text-[#0A261D]/70 text-sm mt-1">Fotografías</span>
            </div>
            <div className="bg-black/20 border border-gold-soft/20 p-6 rounded-2xl flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-[#0A261D] mb-3" />
              <span className="font-serif text-4xl font-bold text-[#0A261D]">{sessionsData.length}</span>
              <span className="font-sans text-[#0A261D]/70 text-sm mt-1">Invitados</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/qr"
              className="w-full bg-forest-natural/40 border border-gold-soft/40 hover:bg-forest-natural/60 text-[#0A261D] font-sans font-bold py-4 rounded-2xl flex items-center justify-center transition-colors"
            >
              <QrCode className="w-5 h-5 mr-3 text-[#0A261D]" /> QR DEL EVENTO
            </Link>
            <Link
              href="/nombre"
              className="w-full bg-forest-natural/40 border border-gold-soft/40 hover:bg-forest-natural/60 text-[#0A261D] font-sans font-bold py-4 rounded-2xl flex items-center justify-center transition-colors"
            >
              <Camera className="w-5 h-5 mr-3 text-[#0A261D]" /> IR A LA CÁMARA
            </Link>
          </div>
        </div>

        <h2 className="font-serif text-2xl font-bold mb-6 text-gold-warm">Control del Álbum</h2>
        <div className="space-y-4 mb-12">
          <Link
            href="/admin/album"
            className="w-full btn-gold text-forest-deep font-sans font-bold py-5 rounded-2xl flex items-center justify-center transition-all text-lg shadow-[0_0_20px_rgba(216,182,90,0.3)]"
          >
            <Images className="w-6 h-6 mr-3" /> VER ÁLBUM COMPLETO
          </Link>
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="w-full bg-forest-natural text-[#FFF7E6] hover:bg-forest-emerald font-sans font-bold py-5 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50 text-lg shadow-lg border border-[#0A261D]/30"
          >
            {downloading ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" /> 
                {downloadProgress.current === downloadProgress.total && downloadProgress.total > 0 
                  ? "Generando ZIP..." 
                  : `Descargando... ${downloadProgress.current} / ${downloadProgress.total}`}
              </>
            ) : (
              <>
                <Download className="w-6 h-6 mr-3" /> DESCARGAR TODAS (ZIP)
              </>
            )}
          </button>
        </div>

        <h2 className="font-serif text-2xl font-bold mb-6 text-gold-warm">Sesiones de Invitados</h2>
        <div className="bg-forest-deep/80 border border-gold-soft/30 rounded-3xl p-6 backdrop-blur shadow-xl space-y-3">
          {sessionsData.length === 0 ? (
            <div className="text-center text-[#0A261D]/50 py-4 font-sans text-sm">No hay invitados aún.</div>
          ) : (
            sessionsData.map((session) => (
              <div
                key={session.id}
                className="flex justify-between items-center border-b border-gold-soft/10 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-sans font-bold text-[#0A261D] text-lg">{session.guest_name}</p>
                  <p className="font-sans text-xs text-[#0A261D]/50">ID: {session.id.split("-")[0]}</p>
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full text-sm font-bold font-sans ${
                    session.photo_count >= 24
                      ? "bg-gold-warm/20 text-gold-warm"
                      : "bg-white/50 text-[#0A261D]/80"
                  }`}
                >
                  {session.photo_count} / 24 fotos
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
