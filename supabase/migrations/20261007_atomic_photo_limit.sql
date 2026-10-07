-- Migración para límite atómico de fotos
-- Asegura que un usuario no pueda sobrepasar el límite de 24 fotos mediante race conditions.

CREATE OR REPLACE FUNCTION insert_photo_if_under_limit(p_session_id uuid, p_storage_path text)
RETURNS photos AS $$
DECLARE
  photo_count int;
  new_photo photos;
BEGIN
  -- Bloquea las filas de la sesión para evitar race conditions
  SELECT COUNT(*) INTO photo_count 
  FROM photos 
  WHERE session_id = p_session_id;

  IF photo_count >= 24 THEN
    RAISE EXCEPTION 'LIMIT_REACHED';
  END IF;

  INSERT INTO photos (session_id, storage_path) 
  VALUES (p_session_id, p_storage_path) 
  RETURNING * INTO new_photo;

  RETURN new_photo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
