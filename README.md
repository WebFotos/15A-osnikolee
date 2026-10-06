# Cámara Desechable Digital - 15 Años

Este proyecto es una aplicación web progresiva (PWA) construida con Next.js que simula una cámara desechable retro, diseñada específicamente para eventos como fiestas de 15 años.

## Arquitectura

*   **Frontend:** Next.js (App Router), React, Tailwind CSS.
*   **Persistencia (Fase 1):** `idb-keyval` (IndexedDB) para almacenamiento local y temporal, preparando la interfaz de funciones asíncronas para facilitar la migración.
*   **Persistencia (Fase 2 - Preparada):** `@supabase/supabase-js` está instalado y preconfigurado con variables de entorno para la eventual migración a una base de datos real.
*   **Iconografía & UI:** `lucide-react` para iconos y `qrcode.react` para generación de códigos QR de acceso.

## Estructura de Rutas

*   `/` - Landing page para iniciar como organizador.
*   `/admin` - Redirige al dashboard de eventos.
*   `/admin/eventos` - Lista de eventos y formulario de creación.
*   `/admin/eventos/[eventId]` - Gestión del evento (cambiar estado, métricas).
*   `/admin/eventos/[eventId]/qr` - Código QR a pantalla completa, listo para imprimir.
*   `/evento/[eventId]` - Pantalla de bienvenida para invitados (solicita nombre y crea sesión).
*   `/evento/[eventId]/camara` - Interfaz principal de la cámara.
*   `/evento/[eventId]/album` - Álbum de fotos, disponible solo cuando el estado del evento es `REVEALED`.

## Ejecución Local

1.  Asegúrate de tener Node.js instalado.
2.  Instala las dependencias: `npm install`
3.  Inicia el servidor de desarrollo: `npm run dev`
4.  Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

*Nota:* Para probar el flujo completo, crea un evento en `/admin`, escanea o abre la URL del QR, y usa la cámara.

## Configuración de Entorno

Las variables de entorno requeridas se encuentran en `.env.example`. Asegúrate de tener `.env.local` configurado con tus credenciales de Supabase para cuando pases a la Fase 2.
