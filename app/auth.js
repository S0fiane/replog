// Replog — auth layer. Supabase magic-link (email OTP).
import { supabase } from "./db.js";

// Send a magic link / OTP code to the email.
// Supabase "magiclink" sends a clickable link; "email" OTP sends a 6-digit code.
// We use magic link — simplest on mobile. The email's redirect returns to this page.
export async function sendMagicLink(email) {
  const clean = email.trim().toLowerCase();
  if (!clean) throw new Error("Enter your email");
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
  return true;
}

// Password sign-in (instant, no email). The user must exist with a password
// set in the Supabase dashboard (Authentication → Users → Add user →
// Create new user → set password + Auto Confirm). Used as a fallback so the
// app works even when Supabase's free-tier magic-link email limit is hit.
export async function signInWithPassword(email, password) {
  const clean = email.trim().toLowerCase();
  if (!clean) throw new Error("Enter your email");
  if (!password) throw new Error("Enter a password");
  const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
  if (error) throw error;
  return true;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Subscribe to auth state changes. Returns an unsubscribe fn.
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null, session);
  });
  return () => data.subscription.unsubscribe();
}