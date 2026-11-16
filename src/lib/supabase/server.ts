import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isDemoMode } from "./config";

/** Server client bound to the learner's session cookie (RLS applies). Null in demo mode. */
export async function supabaseServer() {
  if (isDemoMode) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* called from a Server Component: middleware refreshes the session instead */ }
      },
    },
  });
}
