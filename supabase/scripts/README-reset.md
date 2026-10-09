# Guía de Reinicio de Datos del Evento

Aplicación: **Cámara Desechable Digital — 15 Años Nikolee**  
Proyecto Supabase: `gbqionrucwkxxkxwmeme.supabase.co`

---

> ⚠️ **ADVERTENCIA:** La limpieza borra datos de forma permanente e irreversible.  
> Ejecuta siempre el **Paso 1 (comprobación previa)** antes de borrar nada.

---

## ¿Qué borra este procedimiento?

| Dato | Acción |
|---|---|
| Filas de la tabla `photos` | ✅ Eliminadas por SQL |
| Filas de la tabla `guest_sessions` | ✅ Eliminadas por SQL |
| Archivos físicos en bucket `event_photos` | ✅ Eliminados por Storage API (paso separado) |

## ¿Qué se conserva siempre?

| Elemento | Estado |
|---|---|
| Registro del evento en tabla `events` | ✅ Conservado |
| Esquema, tablas, columnas, índices | ✅ Conservados |
| Políticas RLS | ✅ Conservadas |
| Función RPC `insert_photo_if_under_limit` | ✅ Conservada |
| Bucket `event_assets` y vídeo de bienvenida | ✅ Conservados |
| Archivo `{EVENT_ID}/welcome-config.json` | ✅ Conservado |
| Usuario administrador (Supabase Auth) | ✅ Conservado |
| Variables de entorno de Vercel | ✅ Conservadas |

---

## Procedimiento completo

### Paso 1 — Abrir SQL Editor

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto **gbqionrucwkxxkxwmeme**
3. En el menú lateral, haz clic en **SQL Editor**
4. Crea una nueva consulta con **+ New query**

---

### Paso 2 — Revisar los datos antes de borrar

Antes de ejecutar el script de limpieza, ejecuta **únicamente** las consultas
de la sección `PASO 0` del archivo `reset-event-data.sql`.

Son consultas `SELECT` que no borran nada. Te permitirán ver:
- Cuántas fotografías existen y sus rutas de Storage
- Cuántas sesiones de invitados hay registradas
- Que el evento correcto está seleccionado

Para ejecutarlas: copia únicamente esa sección del SQL, pégala en el editor y haz clic en **Run**.

---

### Paso 3 — Ejecutar la limpieza de PostgreSQL

1. Abre el archivo `supabase/scripts/reset-event-data.sql`
2. Verifica que el `EVENT_ID` al inicio del archivo corresponde al evento que quieres limpiar:
   ```sql
   \set EVENT_ID 'b7642da4-24a3-4d47-a870-5a4d995e494a'
   ```
3. Copia y pega el contenido completo (o solo los `PASO 1` y `PASO 2`) en el SQL Editor
4. Haz clic en **Run**
5. Verifica el resultado de la sección `PASO 3 — VERIFICACIÓN FINAL`:
   - `fotos_restantes` debe ser **0**
   - `sesiones_restantes` debe ser **0**
   - `evento_conservado` debe mostrar el nombre del evento

> ⚠️ **El SQL Editor de Supabase no soporta la sintaxis `\set` de psql.**  
> Si usas el editor web, reemplaza `:EVENT_ID` por el UUID directamente:  
> `'b7642da4-24a3-4d47-a870-5a4d995e494a'`

---

### Paso 4 — Eliminar los archivos físicos de Storage

> **Importante:** Este paso es obligatorio. Las filas de PostgreSQL y los archivos  
> de Storage son independientes. Si solo borras las filas, los archivos quedan  
> huérfanos en el bucket `event_photos`.

Las fotografías se almacenan en el bucket `event_photos` siguiendo este patrón de ruta:
```
{EVENT_ID}/{session_id}/{timestamp}.jpg
```

#### Opción A — Interfaz web de Supabase (recomendada para pocas fotos)

1. Ve a tu proyecto Supabase → **Storage** → bucket **event_photos**
2. Navega a la carpeta con el nombre del EVENT_ID
3. Selecciona todos los archivos y subcarpetas
4. Haz clic en **Delete**

#### Opción B — Script de Node.js (recomendada para muchas fotos)

Crea y ejecuta este script desde la raíz del proyecto:

```javascript
// supabase/scripts/cleanup-storage.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbqionrucwkxxkxwmeme.supabase.co';
// ⚠️ Usa la Service Role Key — NUNCA expongas este valor en el cliente
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVENT_ID = 'b7642da4-24a3-4d47-a870-5a4d995e494a';

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanupStorage() {
  console.log('Listando archivos en Storage...');

  // Listar subcarpetas (una por sesión)
  const { data: folders, error: foldersErr } = await admin.storage
    .from('event_photos')
    .list(EVENT_ID, { limit: 1000 });

  if (foldersErr) {
    console.error('Error listando carpetas:', foldersErr.message);
    return;
  }

  const sessionFolders = (folders || []).filter(f => f.name !== '.emptyFolderPlaceholder');
  console.log(`Sesiones encontradas en Storage: ${sessionFolders.length}`);

  let totalDeleted = 0;

  for (const folder of sessionFolders) {
    const { data: files, error: filesErr } = await admin.storage
      .from('event_photos')
      .list(`${EVENT_ID}/${folder.name}`, { limit: 1000 });

    if (filesErr || !files) continue;

    const paths = files
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => `${EVENT_ID}/${folder.name}/${f.name}`);

    if (paths.length === 0) continue;

    const { error: removeErr } = await admin.storage
      .from('event_photos')
      .remove(paths);

    if (removeErr) {
      console.error(`Error borrando archivos de ${folder.name}:`, removeErr.message);
    } else {
      console.log(`✅ ${paths.length} archivos eliminados de sesión ${folder.name}`);
      totalDeleted += paths.length;
    }
  }

  console.log(`\nTotal archivos eliminados: ${totalDeleted}`);
}

cleanupStorage().catch(console.error);
```

Ejecútalo con:
```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx node supabase/scripts/cleanup-storage.js
```

---

### Paso 5 — Verificación final completa

Después de los pasos 3 y 4, verifica:

**En SQL Editor de Supabase:**
```sql
SELECT
  (SELECT COUNT(*) FROM photos) AS fotos,
  (SELECT COUNT(*) FROM guest_sessions
   WHERE event_id = 'b7642da4-24a3-4d47-a870-5a4d995e494a') AS sesiones;
```
→ Ambos deben ser **0**

**En Storage:**
- Ve a Storage → `event_photos` → carpeta del EVENT_ID
- Debe estar vacía (o contener solo `.emptyFolderPlaceholder`)

**En la aplicación:**
- Entra a `https://15-a-osnikolee.vercel.app/admin`
- Las estadísticas deben mostrar **0 fotografías** y **0 invitados**

---

## Cómo preparar la aplicación para otro evento

> Esta operación es **independiente** de la limpieza de datos y no debe
> ejecutarse durante un reinicio ordinario.

Para adaptar la aplicación a un evento diferente, se deben hacer **tres cambios**:

### A. Actualizar el EVENT_ID en el código

En `src/lib/supabase-server.ts`:
```typescript
export const EVENT_ID = 'NUEVO-UUID-DEL-EVENTO';
export const EVENT_NAME = 'Nombre del Nuevo Evento';
```

### B. Crear el nuevo evento en la base de datos

```sql
INSERT INTO events (id, name, status)
VALUES ('NUEVO-UUID-DEL-EVENTO', 'Nombre del Nuevo Evento', 'PRIVATE');
```

### C. Actualizar el script reset-event-data.sql

Cambia el `EVENT_ID` al inicio del archivo SQL:
```sql
\set EVENT_ID 'NUEVO-UUID-DEL-EVENTO'
```

### D. Redesplegar en Vercel

Haz commit y push de los cambios. Vercel redespliegará automáticamente.

> **Nota:** El bucket `event_photos` puede reutilizarse para el nuevo evento
> (las rutas incluyen el EVENT_ID como prefijo de carpeta, por lo que los
> datos de distintos eventos no se mezclan nunca en Storage).

---

## Estructura de tablas afectadas por la limpieza

```
events
└── id (PK)
    └── name, status

guest_sessions
└── id (PK)
└── event_id (FK → events.id)   ← filtro de limpieza
└── guest_name, created_at

photos
└── id (PK)
└── session_id (FK → guest_sessions.id)  ← se borra primero
└── storage_path                          ← ruta en bucket event_photos
└── created_at
```

## Bucket de Storage

| Bucket | Uso | Borrado en limpieza |
|---|---|---|
| `event_photos` | Fotografías de los invitados | ✅ Sí (Storage API) |
| `event_assets` | Vídeo de bienvenida + config | ❌ Nunca |
