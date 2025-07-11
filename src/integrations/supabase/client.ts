// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ccvfvqhtsaolnypbausu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdmZ2cWh0c2FvbG55cGJhdXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NzA2OTUsImV4cCI6MjA2NzQ0NjY5NX0.tY0gllpKQpamIVa0y3fdomjd72SZy729I8kPIYsuLMU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});