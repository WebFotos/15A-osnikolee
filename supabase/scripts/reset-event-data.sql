-- ============================================================
-- SCRIPT DE REINICIO DE DATOS OPERATIVOS
-- Aplicación: Cámara Desechable Digital
-- ============================================================
--
-- ⚠️  ADVERTENCIA: OPERACIÓN DESTRUCTIVA E IRREVERSIBLE ⚠️
--
--   Este script elimina PERMANENTEMENTE fotografías y sesiones
--   de invitados del evento indicado. Los datos NO pueden
--   recuperarse una vez ejecutado.
--
--   ANTES DE EJECUTAR:
--   1. Confirma que estás en el proyecto Supabase correcto.
--   2. Lee la sección "PASO 0 — COMPROBACIÓN PREVIA" y
--      ejecuta primero esas consultas SELECT para revisar
--      qué datos se van a borrar.
--   3. Lee README-reset.md para el procedimiento completo,
--      incluyendo la limpieza de archivos físicos de Storage.
--
-- ⚠️  IMPORTANTE — STORAGE:
--   Este script elimina únicamente las FILAS de PostgreSQL.
--   Los archivos físicos del bucket 'event_photos' deben
--   borrarse por separado mediante la Storage API de Supabase
--   (ver README-reset.md, Paso 4).
--   NO declares la limpieza completa sin haber eliminado
--   también los archivos de Storage.
--
-- ============================================================
-- ELEMENTOS QUE ESTE SCRIPT CONSERVA (nunca los toca):
--   ✅ Tabla 'events' y el registro del evento
--   ✅ Políticas RLS y funciones RPC
--   ✅ Índices y restricciones de clave foránea
--   ✅ Bucket 'event_assets' y vídeo de bienvenida
--   ✅ Usuarios de Supabase Auth / cuenta administrador
--   ✅ Variables de entorno de Vercel
--   ✅ Código de la aplicación
-- ============================================================


-- ============================================================
-- CONFIGURACIÓN — ajusta este valor antes de ejecutar
-- ============================================================

-- ID del evento cuyos datos se van a reiniciar.
-- Valor actual: 15 Años Nikolee
-- Para obtener el ID real desde la base de datos, usa:
--   SELECT id, name FROM events;

\set EVENT_ID 'b7642da4-24a3-4d47-a870-5a4d995e494a'


-- ============================================================
-- PASO 0 — COMPROBACIÓN PREVIA (ejecutar primero, sin borrar)
-- ============================================================
-- Ejecuta estas consultas SELECT por separado para revisar
-- exactamente qué datos existen antes de proceder al borrado.
-- ============================================================

-- 0.1 Verificar que el evento existe y es el correcto
SELECT id, name, status
FROM events
WHERE id = :'EVENT_ID';

-- 0.2 Contar fotografías del evento
SELECT COUNT(*) AS total_fotos
FROM photos p
JOIN guest_sessions gs ON p.session_id = gs.id
WHERE gs.event_id = :'EVENT_ID';

-- 0.3 Ver las fotografías con sus rutas de Storage
-- (usa estos storage_path para borrar los archivos físicos después)
SELECT
  p.id              AS foto_id,
  p.storage_path,
  p.created_at,
  gs.guest_name,
  gs.id             AS session_id
FROM photos p
JOIN guest_sessions gs ON p.session_id = gs.id
WHERE gs.event_id = :'EVENT_ID'
ORDER BY p.created_at DESC;

-- 0.4 Contar sesiones de invitados
SELECT COUNT(*) AS total_sesiones
FROM guest_sessions
WHERE event_id = :'EVENT_ID';

-- 0.5 Ver las sesiones con su número de fotos
SELECT
  gs.id,
  gs.guest_name,
  gs.created_at,
  COUNT(p.id) AS fotos
FROM guest_sessions gs
LEFT JOIN photos p ON p.session_id = gs.id
WHERE gs.event_id = :'EVENT_ID'
GROUP BY gs.id, gs.guest_name, gs.created_at
ORDER BY gs.created_at DESC;


-- ============================================================
-- PASO 1 — BORRAR FOTOGRAFÍAS
-- (dependen de guest_sessions por clave foránea → van primero)
-- ============================================================

DELETE FROM photos
WHERE session_id IN (
  SELECT id
  FROM guest_sessions
  WHERE event_id = :'EVENT_ID'
);

-- Verificar que quedaron en cero:
-- SELECT COUNT(*) FROM photos p
-- JOIN guest_sessions gs ON p.session_id = gs.id
-- WHERE gs.event_id = :'EVENT_ID';


-- ============================================================
-- PASO 2 — BORRAR SESIONES DE INVITADOS
-- (solo después de borrar las fotos dependientes)
-- ============================================================

DELETE FROM guest_sessions
WHERE event_id = :'EVENT_ID';

-- Verificar que quedaron en cero:
-- SELECT COUNT(*) FROM guest_sessions WHERE event_id = :'EVENT_ID';


-- ============================================================
-- PASO 3 — VERIFICACIÓN FINAL DE POSTGRESQL
-- ============================================================

SELECT
  (
    SELECT COUNT(*) FROM photos p
    JOIN guest_sessions gs ON p.session_id = gs.id
    WHERE gs.event_id = :'EVENT_ID'
  ) AS fotos_restantes,

  (
    SELECT COUNT(*) FROM guest_sessions
    WHERE event_id = :'EVENT_ID'
  ) AS sesiones_restantes,

  (
    SELECT name FROM events WHERE id = :'EVENT_ID'
  ) AS evento_conservado;

-- Resultado esperado:
--   fotos_restantes  | sesiones_restantes | evento_conservado
--   0                | 0                  | 15 Años Nikolee


-- ============================================================
-- ⚠️  RECORDATORIO FINAL — STORAGE
-- ============================================================
--
-- Los archivos físicos de las fotografías en el bucket
-- 'event_photos' NO se borran con este SQL.
--
-- Las rutas siguen el patrón:
--   {EVENT_ID}/{session_id}/{timestamp}.jpg
--
-- Para eliminarlos, sigue el Paso 4 de README-reset.md
-- usando la Storage API de Supabase (JavaScript o interfaz web).
--
-- La limpieza NO está completa hasta que también se borren
-- los archivos de Storage.
-- ============================================================
