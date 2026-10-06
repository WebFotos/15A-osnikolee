export type EventStatus = 'DRAFT' | 'ACTIVE' | 'REVEALED' | 'CLOSED';

export interface Event {
  id: string;
  name: string;
  date: string; // ISO date string
  revealAt: string; // ISO date string
  status: EventStatus;
  createdAt: string; // ISO date string
}

export interface GuestSession {
  id: string;
  eventId: string;
  guestName: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  eventId: string;
  sessionId: string;
  dataUrl: string; // Base64 currently
  createdAt: string;
}
