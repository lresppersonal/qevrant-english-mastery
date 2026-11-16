export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Demo mode = no Supabase project configured. Data then stays in the browser only. */
export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY;
