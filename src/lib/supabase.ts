import { createClient } from '@supabase/supabase-js'

// ✅ Replace these with your actual values
const supabaseUrl = "https://eycuakkufbolyyawlpno.supabase.co"
const supabaseAnonKey = "yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3Vha2t1ZmJvbHl5YXdscG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjkyODMsImV4cCI6MjA2OTgwNTI4M30.cfZgo625Au9Ss0dSJYMuEMWUvuzD-4mOBD1dvnfp_tI"

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase environment variables. Check .env file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Matches the `users` table in your database
 */
export type User = {
  id: string            // UUID (Primary key in your `users` table)
  auth_id: string       // UUID from `auth.users`
  email: string
  name?: string
  role: 'admin' | 'supervisor'
  company_passkey?: string
}

/**
 * Matches the `construction_sites` (or `sites`) table
 */
export type ConstructionSite = {
  id: string
  site_name: string
  contractor: string
  supervisor_id: string
}

/**
 * Matches the `equipment` table
 */
export type Equipment = {
  id: string
  name: string
  status: 'available' | 'in use' | 'transferring'
  site_id: string
}
