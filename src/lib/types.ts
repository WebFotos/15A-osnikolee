export type EventStatus = 'PRIVATE' | 'REVEALED';

export interface GuestSession {
  id: string; // The primary key (UUID)
  guestName: string;
  createdAt: string;
  lastSeenAt?: string;
  status?: string;
}

export interface Photo {
  id: string;
  guestSessionId: string; // Updated from sessionId to match prompt instructions
  dataUrl?: string; // For local storage
  storagePath?: string; // Prepared for Supabase
  createdAt: string;
}

export const EVENT_DETAILS = {
  name: "Recuerdo de mis 15 años",
  protagonist: "Nikolee Valezka",
  location: "Sevilla",
  date: "17/10/2026"
};
