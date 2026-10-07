"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventStatus, EVENT_DETAILS } from "@/lib/types";
import { Loader2, QrCode, Unlock, Lock, Camera, Users, ArrowLeft, RefreshCw } from "lucide-react";

interface SessionRow {
  id: string;
  guest_name: string;
  photo_count: number;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [status, setStatus] = useState<EventStatus>("PRIVATE");
  const [photoCount, setPhotoCount] = useState(0);
  const [sessionsData, setSessionsData] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventRes, sessionsRes] = await Promise.all([
        fetch("/api/admin/event"),
        fetch("/api/admin/sessions"),
      ]);

      if (eventRes.ok) {
        const event = await eventRes.json();
        setStatus(event.status);
      }

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

  const handleUpdateStatus = async (newStatus: EventStatus) => {
    if (!confirm(`¿Seguro que quieres cambiar el estado a ${newStatus}?`)) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      } else {
        alert("Error al actualizar estado");
      }
    } catch {
      alert("Error al actualizar estado");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center relative z-10">
        <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-6 safe-area-pt relative z-10">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center text-gold-soft hover:text-gold-warm font-sans">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a la portada
          </Link>
          <button
            onClick={loadData}
            className="w-10 h-10 rounded-full bg-forest-deep/50 border border-gold-soft/20 flex items-center justify-center text-gold-soft hover:text-gold-warm"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="bg-forest-deep/80 border border-gold-soft/30 rounded-3xl p-8 mb-8 backdrop-blur shadow-xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="font-script text-2xl text-gold-soft mb-1">{EVENT_DETAILS.name}</p>
              <h1 className="font-serif text-3xl font-bold mb-2 text-cream">{EVENT_DETAILS.protagonist}</h1>
              <div className="font-sans text-cream/70 flex items-center gap-2 text-sm uppercase tracking-wider">
                ESTADO:{" "}
                <span
                  className={`font-bold px-3 py-1 rounded-full text-xs ${
                    status === "REVEALED"
                      ? "bg-gold-warm/20 text-gold-warm"
                      : "bg-black/30 text-cream/60 border border-cream/10"
                  }`}
                >
                  {status === "REVEALED" ? "ÁLBUM REVELADO" : "FOTOGRAFÍAS PRIVADAS"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/20 border border-gold-soft/20 p-6 rounded-2xl flex flex-col items-center justify-center">
              <Camera className="w-8 h-8 text-gold-soft mb-3" />
              <span className="font-serif text-4xl font-bold text-cream">{photoCount}</span>
              <span className="font-sans text-gold-soft/70 text-sm mt-1">Fotografías</span>
            </div>
            <div className="bg-black/20 border border-gold-soft/20 p-6 rounded-2xl flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-gold-soft mb-3" />
              <span className="font-serif text-4xl font-bold text-cream">{sessionsData.length}</span>
              <span className="font-sans text-gold-soft/70 text-sm mt-1">Invitados</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/qr"
              className="w-full bg-forest-natural/40 border border-gold-soft/40 hover:bg-forest-natural/60 text-cream font-sans font-bold py-4 rounded-2xl flex items-center justify-center transition-colors"
            >
              <QrCode className="w-5 h-5 mr-3 text-gold-soft" /> QR DEL EVENTO
            </Link>
            <Link
              href="/nombre"
              className="w-full bg-forest-natural/40 border border-gold-soft/40 hover:bg-forest-natural/60 text-cream font-sans font-bold py-4 rounded-2xl flex items-center justify-center transition-colors"
            >
              <Camera className="w-5 h-5 mr-3 text-gold-soft" /> IR A LA CÁMARA
            </Link>
          </div>
        </div>

        <h2 className="font-serif text-2xl font-bold mb-6 text-gold-warm">Control del Álbum</h2>
        <div className="space-y-4 mb-12">
          {status === "PRIVATE" && (
            <button
              onClick={() => handleUpdateStatus("REVEALED")}
              disabled={updating}
              className="w-full btn-gold text-forest-deep font-sans font-bold py-5 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 text-lg shadow-[0_0_20px_rgba(216,182,90,0.3)]"
            >
              <Unlock className="w-6 h-6 mr-3" /> REVELAR FOTOGRAFÍAS
            </button>
          )}
          {status === "REVEALED" && (
            <div className="flex flex-col gap-4">
              <Link
                href="/album"
                className="w-full btn-gold text-forest-deep font-sans font-bold py-5 rounded-2xl flex items-center justify-center transition-colors text-lg"
              >
                VER ÁLBUM
              </Link>
              <button
                onClick={() => handleUpdateStatus("PRIVATE")}
                disabled={updating}
                className="w-full bg-black/40 text-cream/70 hover:bg-black/60 font-sans font-bold py-4 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50 border border-cream/10"
              >
                <Lock className="w-5 h-5 mr-2" /> Ocultar Fotografías
              </button>
            </div>
          )}
        </div>

        <h2 className="font-serif text-2xl font-bold mb-6 text-gold-warm">Sesiones de Invitados</h2>
        <div className="bg-forest-deep/80 border border-gold-soft/30 rounded-3xl p-6 backdrop-blur shadow-xl space-y-3">
          {sessionsData.length === 0 ? (
            <div className="text-center text-gold-soft/50 py-4 font-sans text-sm">No hay invitados aún.</div>
          ) : (
            sessionsData.map((session) => (
              <div
                key={session.id}
                className="flex justify-between items-center border-b border-gold-soft/10 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-sans font-bold text-cream text-lg">{session.guest_name}</p>
                  <p className="font-sans text-xs text-gold-soft/50">ID: {session.id.split("-")[0]}</p>
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full text-sm font-bold font-sans ${
                    session.photo_count >= 24
                      ? "bg-gold-warm/20 text-gold-warm"
                      : "bg-black/40 text-cream/80"
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
