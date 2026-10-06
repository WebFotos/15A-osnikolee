"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getEvent, updateEventStatus, getEventPhotos } from "@/lib/storage";
import { Event, Photo } from "@/lib/types";
import { Loader2, ArrowLeft, QrCode, Unlock, Lock, Camera } from "lucide-react";
import { use } from "react";

export default function AdminEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [event, setEvent] = useState<Event | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    const ev = await getEvent(eventId);
    if (ev) {
      setEvent(ev);
      const photos = await getEventPhotos(eventId);
      setPhotoCount(photos.length);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (status: Event['status']) => {
    if (!confirm(`¿Seguro que quieres cambiar el estado a ${status}?`)) return;
    
    setUpdating(true);
    try {
      const updated = await updateEventStatus(eventId, status);
      if (updated) setEvent(updated);
    } catch (err) {
      alert("Error al actualizar estado");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-white">
        Evento no encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 p-6 text-white safe-area-pt">
      <div className="max-w-2xl mx-auto pt-4">
        <Link href="/admin/eventos" className="inline-flex items-center text-zinc-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Link>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
              <div className="text-zinc-400 flex items-center gap-2">
                Estado: <span className="font-bold text-white">{event.status}</span>
              </div>
            </div>
            <Link 
              href={`/admin/eventos/${eventId}/qr`}
              className="bg-white text-black p-3 rounded-xl hover:bg-zinc-200 transition-colors"
              title="Ver código QR"
            >
              <QrCode className="w-6 h-6" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center">
              <Camera className="w-8 h-8 text-zinc-400 mb-2" />
              <span className="text-3xl font-bold">{photoCount}</span>
              <span className="text-zinc-500 text-sm">Fotos Tomadas</span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">Acciones</h2>
        <div className="space-y-4">
          {event.status === 'ACTIVE' && (
            <button 
              onClick={() => handleUpdateStatus('REVEALED')}
              disabled={updating}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Unlock className="w-5 h-5 mr-2" /> Revelar Álbum (Hacer Público)
            </button>
          )}

          {event.status === 'REVEALED' && (
            <div className="flex gap-4">
              <Link 
                href={`/evento/${eventId}/album`}
                className="flex-1 bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center transition-colors"
              >
                Ver Álbum
              </Link>
              <button 
                onClick={() => handleUpdateStatus('CLOSED')}
                disabled={updating}
                className="flex-1 bg-red-600/20 text-red-500 hover:bg-red-600/30 font-bold py-4 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Lock className="w-5 h-5 mr-2" /> Cerrar Evento
              </button>
            </div>
          )}

          {(event.status === 'CLOSED' || event.status === 'DRAFT') && (
            <button 
              onClick={() => handleUpdateStatus('ACTIVE')}
              disabled={updating}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              Activar Cámaras
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
