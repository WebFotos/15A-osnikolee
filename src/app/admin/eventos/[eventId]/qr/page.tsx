"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { getEvent } from "@/lib/storage";
import { Event } from "@/lib/types";
import { Loader2, ArrowLeft } from "lucide-react";
import { use } from "react";

export default function QRPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");

  useEffect(() => {
    async function load() {
      const ev = await getEvent(eventId);
      if (ev) {
        setEvent(ev);
        // Construir la URL completa
        setUrl(`${window.location.origin}/evento/${eventId}`);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!event || !url) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-white">
        Evento no encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white text-black p-8 flex flex-col items-center justify-center relative">
      <Link 
        href={`/admin/eventos/${eventId}`}
        className="absolute top-8 left-8 text-black/50 hover:text-black print:hidden"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
        <p className="text-2xl text-black/70">Escanea para tomar fotos</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
        <QRCodeSVG 
          value={url} 
          size={300} 
          level="H"
          includeMargin={false}
        />
      </div>
      
      <p className="font-mono text-black/50">{url}</p>

      <button 
        onClick={() => window.print()}
        className="mt-12 bg-black text-white px-8 py-4 rounded-xl font-bold text-lg print:hidden hover:bg-black/80 transition-colors"
      >
        Imprimir QR
      </button>
    </div>
  );
}
