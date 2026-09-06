import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Direct initialization check based solely on presence of environment variables
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[PeoplePulse] Supabase credentials not found in environment. " +
    "Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set."
  );
}

// Pre-process and normalize URL hash if it contains auth tokens in a malformed or double-hashed format (e.g. #reset-password#access_token=)
if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
  const hash = window.location.hash;
  if (!hash.startsWith("#access_token=")) {
    const idx = hash.indexOf("access_token=");
    window.location.hash = "#" + hash.substring(idx);
  }
}

// Create the singleton Supabase client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export default supabase;
