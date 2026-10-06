import { get, set, update } from 'idb-keyval';
import { Event, GuestSession, Photo } from './types';

const STORE_KEYS = {
  EVENTS: 'cd_events',
  SESSIONS: 'cd_sessions',
  PHOTOS: 'cd_photos',
};

// INITIAL MOCK DATA
const initializeStorage = async () => {
  const events = await get<Event[]>(STORE_KEYS.EVENTS);
  if (!events) {
    await set(STORE_KEYS.EVENTS, []);
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

// Wait for initialization before usage
let initPromise: Promise<void> | null = null;
const ensureInit = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!initPromise) {
    initPromise = initializeStorage();
  }
  return initPromise;
};

// Events
export const getEvent = async (id: string): Promise<Event | undefined> => {
  await ensureInit();
  const events = await get<Event[]>(STORE_KEYS.EVENTS) || [];
  return events.find(e => e.id === id);
};

export const getEvents = async (): Promise<Event[]> => {
  await ensureInit();
  return (await get<Event[]>(STORE_KEYS.EVENTS)) || [];
};

export const createEvent = async (event: Omit<Event, 'createdAt'>): Promise<Event> => {
  await ensureInit();
  const newEvent: Event = { ...event, createdAt: new Date().toISOString() };
  await update<Event[]>(STORE_KEYS.EVENTS, (events = []) => [...events, newEvent]);
  return newEvent;
};

export const updateEventStatus = async (id: string, status: Event['status']): Promise<Event | undefined> => {
  await ensureInit();
  let updatedEvent: Event | undefined;
  await update<Event[]>(STORE_KEYS.EVENTS, (events = []) => {
    return events.map(e => {
      if (e.id === id) {
        updatedEvent = { ...e, status };
        return updatedEvent;
      }
      return e;
    });
  });
  return updatedEvent;
};

// Sessions
export const createSession = async (eventId: string, guestName: string): Promise<GuestSession> => {
  await ensureInit();
  const newSession: GuestSession = {
    id: crypto.randomUUID(),
    eventId,
    guestName,
    createdAt: new Date().toISOString()
  };
  await update<GuestSession[]>(STORE_KEYS.SESSIONS, (sessions = []) => [...sessions, newSession]);
  return newSession;
};

export const getSession = async (id: string): Promise<GuestSession | undefined> => {
  await ensureInit();
  const sessions = await get<GuestSession[]>(STORE_KEYS.SESSIONS) || [];
  return sessions.find(s => s.id === id);
};

// Photos
export const savePhoto = async (eventId: string, sessionId: string, dataUrl: string): Promise<Photo> => {
  await ensureInit();
  // Check limit (24 photos per session)
  const allPhotos = await get<Photo[]>(STORE_KEYS.PHOTOS) || [];
  const sessionPhotos = allPhotos.filter(p => p.sessionId === sessionId);
  
  if (sessionPhotos.length >= 24) {
    throw new Error('Límite de 24 fotos alcanzado.');
  }

  const newPhoto: Photo = {
    id: crypto.randomUUID(),
    eventId,
    sessionId,
    dataUrl,
    createdAt: new Date().toISOString()
  };
  
  await update<Photo[]>(STORE_KEYS.PHOTOS, (photos = []) => [...photos, newPhoto]);
  return newPhoto;
};

export const getEventPhotos = async (eventId: string): Promise<Photo[]> => {
  await ensureInit();
  const photos = await get<Photo[]>(STORE_KEYS.PHOTOS) || [];
  return photos.filter(p => p.eventId === eventId);
};

export const getSessionPhotosCount = async (sessionId: string): Promise<number> => {
  await ensureInit();
  const photos = await get<Photo[]>(STORE_KEYS.PHOTOS) || [];
  return photos.filter(p => p.sessionId === sessionId).length;
};
