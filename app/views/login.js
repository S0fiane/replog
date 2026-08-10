// Replog — login view (email magic link).
import { sendMagicLink, signInWithPassword } from "../auth.js";
import { el, mount, icon } from "../ui.js";

export function render(_ctx) {
  const card = el("div", { class: "center-screen" },
    el("div", { class: "login-card" },
      el("div", { class: "mark" }, "◆"),
      el("h1", {}, "Replog"),
      el("p", { class: "muted", style: "margin:4px 0 24px" }, "Log your lifts. Track progress. Syncs across your devices."),
      el("form", { id: "login-form", autocomplete: "on" },
        el("label", { class: "field" },
          el("span", {}, "Email"),
          el("input", { class: "input", type: "email", name: "email", inputmode: "email", placeholder: "you@example.com", required: true, autocomplete: "email" })
        ),
        el("label", { class: "field" },
          el("span", {}, "Password"),
          el("input", { class: "input", type: "password", name: "password", placeholder: "Set one in Supabase → instant sign-in", autocomplete: "current-password" })
        ),
        el("button", { class: "btn primary block", type: "submit" }, "Sign in"),
      ),
      el("div", { class: "muted-2", style: "margin:8px 0 0; font-size:.8rem; line-height:1.45" }, "Enter email + password to sign in instantly. Leave the password empty to get an email magic link instead (slow, and limited on Supabase free)."),
      el("div", { id: "login-status", style: "margin-top:16px" })
    )
  );

  mount(card);

  const form = card.querySelector("#login-form");
  const status = card.querySelector("#login-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const pw = form.password.value;
    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = pw ? "Signing in…" : "Sending…";
    try {
      if (pw) {
        // Instant password sign-in — no email, no redirect, no rate limit.
        await signInWithPassword(email, pw);
        clear(status);
        status.append(el("div", { class: "notice" }, el("div", { style: "font-weight:600" }, "Signed in — loading…")));
        // onAuthChange will fire and re-render to the home view.
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
      }
    } catch (err) {
      clear(status);
      status.append(el("div", { class: "notice", style: "border-color:#3A2224" }, friendlyAuthError(err)));
      btn.textContent = "Try again";
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
    return "Supabase's email limit is temporarily reached (free tier sends ~3–4/hour). You don't have to wait: open an earlier sign-in email from your inbox and click that link — links stay valid for ~24h. Otherwise wait about 60 minutes and try again.";
  }
  if (/invalid.*login.*credentials|invalid.*credentials|wrong.*password|credentials.*invalid/.test(msg)) {
    return "Wrong email or password. Make sure the user exists in Supabase with this password (Authentication → Users) and is auto-confirmed. Or leave the password empty to use a magic link.";
  }
  if (/user not allowed|signup.*disabled|disabled_signup|not.*authorized/.test(msg)) {
    return "New sign-ups are disabled for this app. Contact the owner to be added, or enable sign-ups in Supabase → Authentication → Providers → Email.";
  }
  if (/network|failed to fetch|load failed|timeout/.test(msg)) {
    return "Could not reach the server. Check your internet connection and try again.";
  }
  return `Could not send link: ${err && err.message ? err.message : err}`;
}