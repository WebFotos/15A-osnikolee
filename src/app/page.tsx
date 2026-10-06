import Link from 'next/link';
import { Camera } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        <div className="bg-zinc-900 p-6 rounded-full border border-zinc-800">
          <Camera size={64} className="text-zinc-100" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mt-4">
          Cámara Desechable
        </h1>
        
        <p className="text-zinc-400 text-lg">
          Captura momentos únicos. Escanea el código QR en el evento para comenzar a tomar fotos.
        </p>

        <div className="mt-8 flex flex-col gap-4 w-full">
          <Link href="/admin" className="w-full bg-white text-black font-semibold py-4 rounded-xl text-lg hover:bg-zinc-200 transition-colors">
            Soy el Organizador
          </Link>
          <p className="text-zinc-600 text-sm mt-4">
            ¿Eres invitado? Escanea el QR para entrar directamente a la cámara.
          </p>
        </div>
      </div>
    </main>
  );
}
