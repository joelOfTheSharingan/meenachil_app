import { createClient } from '@supabase/supabase-js'

// ✅ Replace these with your actual environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

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
