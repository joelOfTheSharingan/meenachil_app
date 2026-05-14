import { createClient } from "@supabase/supabase-js";

/* =========================
   SUPABASE CONFIG
========================= */

const supabaseUrl = "https://eycuakkufbolyyawlpno.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3Vha2t1ZmJvbHl5YXdscG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjkyODMsImV4cCI6MjA2OTgwNTI4M30.cfZgo625Au9Ss0dSJYMuEMWUvuzD-4mOBD1dvnfp_tI"; // keep your real anon key here

/* =========================
   CLIENT (FIXED AUTH)
========================= */

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,

    // IMPORTANT: must be SAME in all your apps
    storageKey: "joel-global-auth",
  },
});

/* =========================
   SCHEMA (meenachil)
========================= */

export const meenachil = supabase.schema("meenachil");

/* =========================
   STORAGE
========================= */

export const STORAGE_BUCKET = "Transfer-Images";

/* =========================
   UPLOAD FUNCTION
========================= */

export async function uploadImageToSupabase(file: File) {
  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `transfers/${fileName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}