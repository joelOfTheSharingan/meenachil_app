import { createClient } from "@supabase/supabase-js";

// ✅ Replace with your actual Supabase values
const supabaseUrl = "https://eycuakkufbolyyawlpno.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3Vha2t1ZmJvbHl5YXdscG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjkyODMsImV4cCI6MjA2OTgwNTI4M30.cfZgo625Au9Ss0dSJYMuEMWUvuzD-4mOBD1dvnfp_tI";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase environment variables. Check .env file.");
}

// 🔑 Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Matches the `users` table in your database
 */
export type User = {
  id: string; // UUID from auth.users (primary key)
  email: string;
  role: "admin" | "supervisor";
  name?: string;
  phone?: string;
  company_passkey?: string;
  site_id?: string | null; // link to site, can be null
};

/**
 * Matches the `construction_sites` table
 */
export type ConstructionSite = {
  id: string; // UUID
  site_name: string;
  contractor: string;
  supervisor_id: string; // user.id (UUID)
};

/**
 * Matches the `equipment` table
 */
export type Equipment = {
  id: number; // Postgres int8
  name: string;
  status: "available" | "in use" | "transferring";
  site_id: string; // UUID
  isRental: boolean;
  quantity: number; // ✅ Track quantity directly
};

/**
 * Matches the `equipment_transfers` table
 */
export type EquipmentTransfer = {
  id: number; // Postgres int8
  equipment_id: number; // int8
  from_site_id: string; // UUID
  to_site_id: string; // UUID
  requested_by: string; // user.id (UUID)
  approved_by?: string; // user.id (UUID)
  quantity: number;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  created_at: string;
};

/**
 * Matches the `equipment_requests` table
 * New table for buy / sell / return requests
 */
export type EquipmentRequest = {
  id: number; // Postgres int8
  site_id: string; // UUID → references construction_sites.id
  requested_by: string; // UUID → references users.id
  type: "buy" | "sell" | "return"; // what action
  equipment_name: string; // supervisor can enter custom name
  isRental: boolean; 
  quantity: number;
  status: "pending" | "approved" | "rejected";
  approved_by?: string; // UUID → user.id
  created_at: string;
};
