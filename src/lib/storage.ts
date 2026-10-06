import { supabase } from './supabase';
import { EventStatus, GuestSession, Photo, PhotoWithUrl } from './types';

// Asumimos que solo hay un evento o usamos el primero que encontremos
const getSingleEventId = async (): Promise<string> => {
  const { data, error } = await supabase.from('events').select('id').limit(1).single();
  if (error || !data) {
    // Fallback if no event exists, create one or throw
    throw new Error("No se encontró el evento principal.");
  }
  return data.id;
};

// Event State
export const getEventStatus = async (): Promise<EventStatus> => {
  try {
    const { data, error } = await supabase.from('events').select('status').limit(1).single();
    if (error || !data) return 'PRIVATE';
    return data.status as EventStatus;
  } catch (e) {
    return 'PRIVATE';
  }
};

export const updateEventStatus = async (status: EventStatus): Promise<EventStatus> => {
  const eventId = await getSingleEventId();
  const { error } = await supabase.from('events').update({ status }).eq('id', eventId);
  if (error) throw new Error(error.message);
  return status;
};

// Admin backwards compatibility if user asked for it
export const getEvent = async (id: string) => {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const getAllEvents = async () => {
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw error;
  return data;
};

// Sessions
export const createSession = async (guestName: string): Promise<GuestSession> => {
  // Opcionalmente podemos vincularla al eventId si la base de datos lo requiere,
  // pero el prompt dice que insertemos en guest_sessions.
  const { data, error } = await supabase
    .from('guest_sessions')
    .insert([{ guest_name: guestName }])
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as GuestSession;
};

export const getSession = async (id: string): Promise<GuestSession | undefined> => {
  const { data, error } = await supabase.from('guest_sessions').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return data as GuestSession;
};

export const getAllSessions = async (): Promise<GuestSession[]> => {
  const { data, error } = await supabase.from('guest_sessions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as GuestSession[];
};

export const getAllSessionsCount = async (): Promise<number> => {
  const { count, error } = await supabase.from('guest_sessions').select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count || 0;
};

export const updateSessionLastSeen = async (id: string): Promise<void> => {
  await supabase.from('guest_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', id);
};

// Helpers for Data URL to Blob
const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error("Formato de imagen inválido");
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Photos
export const savePhoto = async (guestSessionId: string, dataUrl: string): Promise<PhotoWithUrl> => {
  // 1. Check limit directly from database
  const { count, error: countError } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', guestSessionId);

  if (countError) throw new Error(countError.message);
  if (count !== null && count >= 24) {
    throw new Error('No quedan fotografías disponibles.');
  }

  // 2. Convert DataURL to Blob
  const blob = dataURLtoBlob(dataUrl);
  const fileExt = blob.type.split('/')[1] || 'jpg';
  
  // En caso de que el bucket requiera eventId, lo obtenemos. 
  // El usuario dijo: `${eventId}/${sessionId}/${Date.now()}.jpg`
  // Si no tenemos eventId exacto, usaremos "evento-principal"
  let eventId = "evento-principal";
  try {
    eventId = await getSingleEventId();
  } catch (e) {
    // Ignorar si no hay evento
  }

  const path = `${eventId}/${guestSessionId}/${Date.now()}.${fileExt}`;

  // 3. Upload to bucket
  const { error: uploadError } = await supabase.storage
    .from('event_photos')
    .upload(path, blob, {
      contentType: blob.type,
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw new Error(`Error al subir la foto: ${uploadError.message}`);

  // 4. Insert record into `photos` table
  const { data: photoRecord, error: insertError } = await supabase
    .from('photos')
    .insert([{ 
      session_id: guestSessionId, 
      storage_path: path 
    }])
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);

  // Return with public URL
  const { data: publicUrlData } = supabase.storage.from('event_photos').getPublicUrl(path);

  return {
    ...photoRecord,
    url: publicUrlData.publicUrl
  } as PhotoWithUrl;
};

// Helper para convertir los registros de fotos a objetos con URL pública
const mapPhotosWithUrls = (photos: Photo[]): PhotoWithUrl[] => {
  return photos.map(photo => {
    const { data } = supabase.storage.from('event_photos').getPublicUrl(photo.storage_path);
    return {
      ...photo,
      url: data.publicUrl
    };
  });
};

export const getAllPhotos = async (): Promise<PhotoWithUrl[]> => {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return mapPhotosWithUrls(data as Photo[]);
};

export const getSessionPhotos = async (guestSessionId: string): Promise<PhotoWithUrl[]> => {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('session_id', guestSessionId)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return mapPhotosWithUrls(data as Photo[]);
};

// Si en un futuro necesitas esto, lo mantenemos por requerimiento:
export const getPhotosBySession = getSessionPhotos;
export const getPhotosByEvent = async (eventId: string): Promise<PhotoWithUrl[]> => {
  // Podría requerir un JOIN si events y photos no están directamente enlazados,
  // o simplemente devolver todas ya que hay 1 solo evento.
  return getAllPhotos();
};
