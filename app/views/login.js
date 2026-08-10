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
      status.append(el("div", { class: "notice", style: "border-color:#3A2224" }, `Could not send link: ${err.message}`));
      btn.textContent = "Try again";
    } finally {
      btn.disabled = false;
    }
  });
}

function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }