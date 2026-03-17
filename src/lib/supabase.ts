import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:   true,   // always save session to localStorage
    autoRefreshToken: true,   // silently refresh expired access tokens
    detectSessionInUrl: false,
  },
});

/**
 * Ensures an anonymous session exists. Safe to call multiple times.
 *
 * Strategy:
 *  1. getSession()  — instant, reads from localStorage
 *  2. getUser()     — network call, forces token refresh if access token
 *                     is stale but refresh token is still valid
 *  3. signInAnonymously() — only if there is genuinely no prior session
 */
export async function ensureAuth(): Promise<string> {
  // 1. Fast path — valid session already in memory / localStorage
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  // 2. Slow path — access token may be expired; getUser() will use the
  //    refresh token to get a new one without creating a new user
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;

  // 3. Truly no session — first visit or storage cleared
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user!.id;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
