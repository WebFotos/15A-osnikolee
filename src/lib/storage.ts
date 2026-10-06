import { get, set, update } from 'idb-keyval';
import { EventStatus, GuestSession, Photo } from './types';

const STORE_KEYS = {
  EVENT_STATUS: 'cd_15_status',
  SESSIONS: 'cd_15_sessions',
  PHOTOS: 'cd_15_photos',
};

// INITIAL MOCK DATA
const initializeStorage = async () => {
  const status = await get<EventStatus>(STORE_KEYS.EVENT_STATUS);
  if (!status) {
    await set(STORE_KEYS.EVENT_STATUS, 'PRIVATE');
  }
  const sessions = await get<GuestSession[]>(STORE_KEYS.SESSIONS);
  if (!sessions) {
    await set(STORE_KEYS.SESSIONS, []);
  }
  const photos = await get<Photo[]>(STORE_KEYS.PHOTOS);
  if (!photos) {
    await set(STORE_KEYS.PHOTOS, []);
  }
};

let initPromise: Promise<void> | null = null;
const ensureInit = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!initPromise) {
    initPromise = initializeStorage();
  }
  return initPromise;
};

// Event State
export const getEventStatus = async (): Promise<EventStatus> => {
  await ensureInit();
  return (await get<EventStatus>(STORE_KEYS.EVENT_STATUS)) || 'PRIVATE';
};

export const updateEventStatus = async (status: EventStatus): Promise<EventStatus> => {
  await ensureInit();
  await set(STORE_KEYS.EVENT_STATUS, status);
  return status;
};

// Sessions
export const createSession = async (guestName: string): Promise<GuestSession> => {
  await ensureInit();
  const newSession: GuestSession = {
    id: crypto.randomUUID(),
    guestName,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString()
  };
  await update<GuestSession[]>(STORE_KEYS.SESSIONS, (sessions = []) => [...sessions, newSession]);
  return newSession;
};

export const getSession = async (id: string): Promise<GuestSession | undefined> => {
  await ensureInit();
  const sessions = await get<GuestSession[]>(STORE_KEYS.SESSIONS) || [];
  return sessions.find(s => s.id === id);
};

export const getAllSessions = async (): Promise<GuestSession[]> => {
  await ensureInit();
  return (await get<GuestSession[]>(STORE_KEYS.SESSIONS)) || [];
};

export const getAllSessionsCount = async (): Promise<number> => {
  await ensureInit();
  const sessions = await get<GuestSession[]>(STORE_KEYS.SESSIONS) || [];
  return sessions.length;
};

export const updateSessionLastSeen = async (id: string): Promise<void> => {
  await ensureInit();
  await update<GuestSession[]>(STORE_KEYS.SESSIONS, (sessions = []) => {
    return sessions.map(s => s.id === id ? { ...s, lastSeenAt: new Date().toISOString() } : s);
  });
};

// Photos
export const savePhoto = async (guestSessionId: string, dataUrl: string): Promise<Photo> => {
  await ensureInit();
  
  // Rule of the backend: calculate max per session
  const allPhotos = await get<Photo[]>(STORE_KEYS.PHOTOS) || [];
  const sessionPhotos = allPhotos.filter(p => p.guestSessionId === guestSessionId);
  
  if (sessionPhotos.length >= 24) {
    throw new Error('No quedan fotografías disponibles.');
  }

  const newPhoto: Photo = {
    id: crypto.randomUUID(),
    guestSessionId,
    dataUrl,
    createdAt: new Date().toISOString()
  };
  
  await update<Photo[]>(STORE_KEYS.PHOTOS, (photos = []) => [...photos, newPhoto]);
  return newPhoto;
};

export const getAllPhotos = async (): Promise<Photo[]> => {
  await ensureInit();
  return (await get<Photo[]>(STORE_KEYS.PHOTOS)) || [];
};

export const getSessionPhotos = async (guestSessionId: string): Promise<Photo[]> => {
  await ensureInit();
  const photos = await get<Photo[]>(STORE_KEYS.PHOTOS) || [];
  return photos.filter(p => p.guestSessionId === guestSessionId);
};
