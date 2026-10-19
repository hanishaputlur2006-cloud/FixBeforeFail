import { createClient } from '@supabase/supabase-js'

// Values come from .env.local (never committed). Vite only exposes
// variables starting with VITE_ to browser code.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env.local, fill in the values, then restart "npm run dev".',
  )
}

// One shared client for the whole app.
export const supabase = createClient(url, anonKey)
