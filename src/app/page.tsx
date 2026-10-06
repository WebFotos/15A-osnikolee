"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { EVENT_DETAILS, GuestSession } from '@/lib/types';
import { getSession, getSessionPhotos } from '@/lib/storage';
import { Camera, RefreshCw } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [photosLeft, setPhotosLeft] = useState<number>(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const sessionId = localStorage.getItem('cd_session');
      if (sessionId) {
        const storedSession = await getSession(sessionId);
        if (storedSession) {
          setSession(storedSession);
          const photos = await getSessionPhotos(sessionId);
          setPhotosLeft(24 - photos.length);
        } else {
          // Si el ID guardado no existe en base de datos, lo limpiamos
          localStorage.removeItem('cd_session');
        }
      }
      setLoading(false);
    }
    checkSession();
  }, []);

  const handleNewGuest = () => {
    localStorage.removeItem('cd_session');
    router.push('/nombre');
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center p-6 text-center relative z-10 overflow-hidden">
      
      {/* Background illustration */}
      <div className="absolute inset-0 z-0 opacity-20 mask-image-b">
        <Image 
          src="/invitacion.jpg" 
          alt="Bosque Encantado Fondo" 
          fill 
          className="object-cover blur-[8px] scale-110"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-deep/50 via-forest-deep/80 to-forest-deep" />
      </div>

      <div className="flex flex-col items-center justify-center max-w-md w-full gap-8 relative z-10 mt-8">
        
        {/* Main Illustration Framed */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full p-1 bg-gradient-to-b from-gold-warm to-gold-soft shadow-[0_0_30px_rgba(216,182,90,0.3)] mb-4">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-forest-deep relative">
            <Image 
              src="/invitacion.jpg" 
              alt="Princesa y el Sapo" 
              fill 
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-gold-warm rounded-full blur-xl opacity-50 animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gold-soft rounded-full blur-xl opacity-50 animate-pulse" />
        </div>

        {/* Ornate Header */}
        <div className="flex flex-col items-center gap-2">
          <p className="font-script text-4xl sm:text-5xl text-gold-soft mb-2 drop-shadow-lg">Recuerdo de mis</p>
          <h1 className="font-serif text-6xl sm:text-7xl tracking-wider text-cream font-bold drop-shadow-xl">15 AÑOS</h1>
        </div>
        
        <div className="w-40 h-[1px] bg-gradient-to-r from-transparent via-gold-warm to-transparent my-2" />
        
        <div className="flex flex-col items-center gap-3">
          <h2 className="font-script text-4xl text-cream font-bold drop-shadow-md">{EVENT_DETAILS.protagonist}</h2>
          <p className="font-sans text-gold-soft/80 text-sm tracking-[0.2em] uppercase mt-2 font-bold">
            {EVENT_DETAILS.location} &middot; {EVENT_DETAILS.date}
          </p>
        </div>

        {/* Action */}
        <div className="mt-8 w-full flex flex-col items-center gap-4 transition-opacity duration-500" style={{ opacity: loading ? 0 : 1 }}>
          
          {session ? (
            <div className="w-full flex flex-col items-center gap-4 bg-black/40 p-6 rounded-3xl border border-gold-soft/20 backdrop-blur-sm shadow-xl">
              <p className="font-serif text-2xl text-cream">Hola {session.guest_name}</p>
              
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-gold-warm shadow-[0_0_10px_rgba(216,182,90,0.8)] animate-pulse" />
                <p className="font-sans text-gold-soft/80 font-bold tracking-widest text-sm uppercase">
                  Te quedan {photosLeft} {photosLeft === 1 ? 'fotografía' : 'fotografías'}
                </p>
              </div>

              <Link 
                href="/camara" 
                className="w-full btn-gold text-forest-deep font-bold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 transition-transform relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <Camera size={24} className="relative z-10" />
                <span className="relative z-10">CONTINUAR</span>
              </Link>
              
              <button 
                onClick={handleNewGuest}
                className="mt-2 text-cream/50 text-sm font-sans flex items-center gap-2 hover:text-cream transition-colors"
              >
                <RefreshCw size={14} />
                Comenzar como otro invitado
              </button>
            </div>
          ) : (
            <>
              <Link 
                href="/nombre" 
                className="w-full btn-gold text-forest-deep font-bold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 transition-transform relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <Camera size={24} className="relative z-10" />
                <span className="relative z-10">ENTRAR A LA CÁMARA</span>
              </Link>
              
              <p className="text-cream/50 text-sm font-sans px-4">
                Captura los mejores momentos de esta noche mágica.
              </p>
            </>
          )}

        </div>
        
      </div>
    </main>
  );
}
