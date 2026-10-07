import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase server configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

/**
 * ONLY for use in server-side code (API routes, Server Actions).
 * NEVER import this in 'use client' components.
 * NEVER reference SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_ prefix.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const EVENT_ID = 'b7642da4-24a3-4d47-a870-5a4d995e494a';
export const EVENT_NAME = '15 Años Nikolee';
