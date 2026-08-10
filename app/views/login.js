// Replog — login view (email magic link).
import { sendMagicLink } from "../auth.js";
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
        el("button", { class: "btn primary block", type: "submit" }, "Send magic link"),
      ),
      el("div", { id: "login-status", style: "margin-top:16px" })
    )
  );

  mount(card);

  const form = card.querySelector("#login-form");
  const status = card.querySelector("#login-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      await sendMagicLink(email);
      clear(status);
      status.append(
        el("div", { class: "notice" },
          el("div", { style: "font-weight:600; margin-bottom:4px" }, "Check your email"),
          el("div", { class: "muted" }, `A sign-in link was sent to ${email}. Click it to open Replog.`)
        )
      );
      btn.textContent = "Resend link";
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
  if (/user not allowed|signup.*disabled|disabled_signup|not.*authorized/.test(msg)) {
    return "New sign-ups are disabled for this app. Contact the owner to be added, or enable sign-ups in Supabase → Authentication → Providers → Email.";
  }
  if (/network|failed to fetch|load failed|timeout/.test(msg)) {
    return "Could not reach the server. Check your internet connection and try again.";
  }
  return `Could not send link: ${err && err.message ? err.message : err}`;
}