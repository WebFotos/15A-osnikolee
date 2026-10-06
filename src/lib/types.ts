export type EventStatus = 'PRIVATE' | 'REVEALED';

export interface Event {
  id: string;
  name?: string;
  status: EventStatus;
  created_at: string;
}

export interface GuestSession {
  id: string; // UUID
  guest_name: string; // Maps to database guest_name
  created_at: string;
  last_seen_at?: string;
}

export interface Photo {
  id: string;
  session_id: string; // Matches Supabase column session_id as requested
  storage_path: string;
  created_at: string;
}

// Para uso en la UI cuando necesitamos la URL firmada o pública
export interface PhotoWithUrl extends Photo {
  url: string;
}

export const EVENT_DETAILS = {
  name: "Recuerdo de mis 15 años",
  protagonist: "Nikolee Valezka",
  location: "Sevilla",
  date: "17/10/2026"
};
