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

// Email + password sign-in. Primary path — does NOT depend on email delivery,
// so it's immune to Supabase's built-in mailer rate limits. The account must
// already exist (created in the Supabase dashboard, or via signUp below).
export async function signInWithPassword(email, password) {
  const clean = email.trim().toLowerCase();
  if (!clean) throw new Error("Enter your email");
  if (!password) throw new Error("Enter your password");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: clean,
    password,
  });
  if (error) throw error;
  return data.user;
}

// Create a new account with email + password. Note: with mailer_autoconfirm on,
// Supabase sends a confirmation email — which can hit the same rate limit. For a
// no-email setup, create the user in the dashboard with Auto Confirm = ON instead.
export async function signUpWithPassword(email, password) {
  const clean = email.trim().toLowerCase();
  if (!clean) throw new Error("Enter your email");
  if (!password) throw new Error("Enter a password");
  const { data, error } = await supabase.auth.signUp({ email: clean, password });
  if (error) throw error;
  return data.user;
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