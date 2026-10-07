import { EventStatus, GuestSession, PhotoWithUrl } from './types';

// --- Helpers ---

const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error('Formato de imagen inválido');
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(err.message || 'Error de red');
  }
  return res.json();
};

// --- Guest Session ---

export const createSession = async (guestName: string): Promise<GuestSession> => {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: guestName }),
  });
  return handleResponse(res);
};

export const getSession = async (_idUnused?: string): Promise<(GuestSession & { photo_count: number; photos_remaining: number }) | undefined> => {
  const res = await fetch('/api/session');
  if (res.status === 401) return undefined;
  if (!res.ok) return undefined;
  return res.json();
};

export const clearSession = async (): Promise<void> => {
  await fetch('/api/session', { method: 'DELETE' });
};

export const updateSessionLastSeen = async (_id: string): Promise<void> => {
  // Handled automatically on each API call via cookie
};

// --- Photos ---

/**
 * Uploads a photo to the server.
 * The session_id is determined server-side from the HttpOnly cookie.
 * The _sessionId parameter is kept for backwards-compatibility but IGNORED.
 */
export const savePhoto = async (_sessionId: string, dataUrl: string): Promise<PhotoWithUrl> => {
  const blob = dataURLtoBlob(dataUrl);
  const formData = new FormData();
  formData.append('photo', blob, `photo_${Date.now()}.jpg`);

  const res = await fetch('/api/photo', {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
};

/**
 * Gets photos for the current session (from cookie).
 * The _sessionId parameter is kept for backwards-compatibility but IGNORED.
 */
export const getSessionPhotos = async (_sessionId?: string): Promise<PhotoWithUrl[]> => {
  const res = await fetch('/api/mis-fotos');
  if (res.status === 401) return [];
  if (!res.ok) return [];
  return res.json();
};

export const getPhotosBySession = getSessionPhotos;

// --- Event Status ---

export const getEventStatus = async (): Promise<EventStatus> => {
  const res = await fetch('/api/event-status');
  if (!res.ok) return 'PRIVATE';
  const data = await res.json();
  return data.status as EventStatus;
};

// --- Album (public when REVEALED) ---

export const getAllPhotos = async (): Promise<PhotoWithUrl[]> => {
  const res = await fetch('/api/album');
  if (!res.ok) return [];
  return res.json();
};

// --- Admin Operations (require admin_session cookie) ---

export const getAllSessions = async (): Promise<(GuestSession & { photo_count: number })[]> => {
  const res = await fetch('/api/admin/sessions');
  if (!res.ok) throw new Error('Error al cargar sesiones');
  return res.json();
};

export const getAllSessionsCount = async (): Promise<number> => {
  const sessions = await getAllSessions();
  return sessions.length;
};

export const updateEventStatus = async (status: EventStatus): Promise<EventStatus> => {
  const res = await fetch('/api/admin/event', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Error al actualizar estado');
  const data = await res.json();
  return data.status as EventStatus;
};

export const getPhotosByEvent = getAllPhotos;

// Legacy compatibility
export const getEvent = async (_id: string) => ({ id: _id, status: await getEventStatus(), name: '15 Años Nikolee' });
export const getAllEvents = async () => [];
