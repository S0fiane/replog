// Replog — login view. Password sign-in (primary, no email dependency) with a
// magic-link fallback toggle.
import { sendMagicLink, signInWithPassword } from "../auth.js";
import { el, mount } from "../ui.js";

export function render(_ctx) {
  const card = el("div", { class: "center-screen" },
    el("div", { class: "login-card" },
      el("div", { class: "mark" }, "◆"),
      el("h1", {}, "Replog"),
      el("p", { class: "muted", style: "margin:4px 0 24px" }, "Log your lifts. Track progress. Syncs across your devices."),
      el("form", { id: "login-form", autocomplete: "on" },
        el("label", { class: "field" },
          el("span", {}, "Email"),
          el("input", { class: "input", type: "email", name: "email", id: "li-email", inputmode: "email", placeholder: "you@example.com", required: true, autocomplete: "email" })
        ),
        el("label", { class: "field", id: "pw-field", style: "margin-top:12px" },
          el("span", {}, "Password"),
          el("input", { class: "input", type: "password", name: "password", id: "li-password", placeholder: "Your password", autocomplete: "current-password" })
        ),
        el("button", { class: "btn primary block", id: "li-submit", type: "submit", style: "margin-top:16px" }, "Sign in")
      ),
      el("button", { id: "li-toggle", class: "btn ghost sm", style: "margin-top:10px; width:100%" }, "Use a magic link instead"),
      el("div", { id: "login-status", style: "margin-top:16px" })
    )
  );

  mount(card);

  const form = card.querySelector("#login-form");
  const status = card.querySelector("#login-status");
  const btn = form.querySelector("#li-submit");
  const pwField = card.querySelector("#pw-field");
  const toggle = card.querySelector("#li-toggle");
  let mode = "password"; // "password" | "magic"

  toggle.addEventListener("click", () => {
    mode = mode === "password" ? "magic" : "password";
    if (mode === "magic") {
      pwField.style.display = "none";
      btn.textContent = "Send magic link";
      toggle.textContent = "Use a password instead";
    } else {
      pwField.style.display = "";
      btn.textContent = "Sign in";
      toggle.textContent = "Use a magic link instead";
    }
    clear(status);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    btn.disabled = true;
    btn.textContent = mode === "password" ? "Signing in…" : "Sending…";
    try {
      if (mode === "password") {
        await signInWithPassword(email, form.password.value);
        // onAuthChange in main.js picks up the session and re-renders.
      } else {
        await sendMagicLink(email);
        clear(status);
        status.append(
          el("div", { class: "notice" },
            el("div", { style: "font-weight:600; margin-bottom:4px" }, "Check your email"),
            el("div", { class: "muted" }, `A sign-in link was sent to ${email}. Click it to open Replog.`)
          )
        );
        btn.textContent = "Resend link";
        return;
      }
    } catch (err) {
      clear(status);
      status.append(el("div", { class: "notice", style: "border-color:#3A2224" }, friendlyAuthError(err)));
      btn.textContent = mode === "password" ? "Sign in" : "Send magic link";
    } finally {
      btn.disabled = false;
    }
  });
}

function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

// Map raw Supabase auth errors to actionable guidance.
function friendlyAuthError(err) {
  const msg = (err && err.message ? err.message : String(err)).toLowerCase();
  if (/rate.?limit|over_email_send_rate_limit|429|too many/.test(msg)) {
    return "Too many sign-in emails sent. Supabase limits magic links to a few per hour per email address. Wait about 60 minutes, use a different email, or sign in with a password instead.";
  }
  if (/invalid login credentials|invalid credentials|wrong password|incorrect/.test(msg)) {
    return "Wrong email or password. Double-check them — or create the user in your Supabase dashboard first (Authentication → Users → Add user, Auto Confirm on).";
  }
  if (/user not allowed|signup.*disabled|disabled_signup|not.*authorized/.test(msg)) {
    return "New sign-ups are disabled for this app. Create your user in the Supabase dashboard (Authentication → Users → Add user) instead.";
  }
  if (/network|failed to fetch|load failed|timeout/.test(msg)) {
    return "Could not reach the server. Check your internet connection and try again.";
  }
  return `Could not sign in: ${err && err.message ? err.message : err}`;
}