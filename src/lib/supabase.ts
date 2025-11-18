import { createClient } from "@supabase/supabase-js";

// Supabase credentials
const supabaseUrl = "https://eycuakkufbolyyawlpno.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3Vha2t1ZmJvbHl5YXdscG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjkyODMsImV4cCI6MjA2OTgwNTI4M30.cfZgo625Au9Ss0dSJYMuEMWUvuzD-4mOBD1dvnfp_tI";

export const STORAGE_BUCKET = "Transfer-Images";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImageToSupabase(file: File) {
  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `transfers/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/** Type definitions */

export type User = {
  id: string;
  email: string;
  role: "admin" | "supervisor";
  name?: string;
  phone?: string;
  company_passkey?: string;
  site_id?: string | null;
};

export type ConstructionSite = {
  id: string;
  site_name: string;
  contractor: string;
  supervisor_id: string;
};

export type Equipment = {
  id: number;
  name: string;
  status: "available" | "in use" | "transferring";
  site_id: string;
  isRental: boolean;
  quantity: number;
};

export type EquipmentTransfer = {
  id: number;
  equipment_id: number;
  from_site_id: string;
  to_site_id: string;
  requested_by: string;
  approved_by?: string;
  quantity: number;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  vehicle_number?: string;
  remarks?: string;
  created_at: string;
  image_url?: string;
};

export type EquipmentRequest = {
  id: string;
  site_id: string;
  supervisor_id: string;
  type: "buy" | "sell" | "return" | "rent";
  equipment_name?: string;
  equipment_id?: number;
  quantity: number;
  isRental: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
