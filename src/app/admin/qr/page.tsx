"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { EVENT_DETAILS } from "@/lib/types";
import { Loader2, ArrowLeft, Download } from "lucide-react";

export default function QRPage() {
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");

  useEffect(() => {
    // URL en producción usando variable de entorno, si no, origen actual
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setUrl(baseUrl);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center relative z-10">
        <Loader2 className="w-8 h-8 animate-spin text-cream" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-forest-deep p-8 flex flex-col items-center justify-center relative z-10">
      
      {/* Background to make it feel like the enchanted forest theme, but clean for printing */}
      <div className="absolute inset-0 bg-white z-0 print:block hidden" />

      <Link 
        href={`/admin`}
        className="absolute top-8 left-8 text-cream hover:text-gold-warm print:hidden z-20"
      >
        <ArrowLeft className="w-8 h-8" />
      </Link>

      <div className="z-10 bg-forest-deep/90 print:bg-white print:text-black border-2 border-gold-soft/30 print:border-black p-12 rounded-[3rem] backdrop-blur max-w-lg w-full text-center shadow-2xl flex flex-col items-center">
        
        <p className="font-script text-4xl text-cream print:text-black mb-2">Recuerdo de mis 15 años</p>
        <h1 className="font-serif text-5xl font-bold text-cream print:text-black mb-12">{EVENT_DETAILS.protagonist}</h1>
        
        <div className="bg-cream p-6 rounded-3xl shadow-xl mb-12 print:shadow-none print:p-0 print:mb-8">
          <QRCodeSVG 
            value={url} 
            size={280} 
            level="H"
            includeMargin={false}
            fgColor="#123B2A" // forest-deep
          />
        </div>
        
        <p className="font-sans text-xl text-gold-warm print:text-black font-bold uppercase tracking-widest mb-4">
          Escanea para entrar a la cámara
        </p>
        
        <p className="font-sans text-cream/50 print:text-black/50 text-sm">
          {url}
        </p>

      </div>

      <button 
        onClick={() => window.print()}
        className="mt-12 btn-gold text-forest-deep px-10 py-5 rounded-2xl font-bold text-lg print:hidden flex items-center gap-3 z-10 shadow-[0_0_20px_rgba(216,182,90,0.3)]"
      >
        <Download size={24} />
        DESCARGAR QR
      </button>
    </div>
  );
}
