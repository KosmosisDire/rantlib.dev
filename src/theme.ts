import { createElement, Moon, Sun } from "lucide";
import sites from "../sites.json";

// A cookie, not localStorage: it is shared by the subdomains and by every port on localhost.
const domain = sites.site.host;

// Loaded as a plain script in the head so a saved choice applies before the first paint.
(() => {
  const root = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");

  const saved = document.cookie.match(/(?:^|; )theme=(light|dark)/)?.[1];
  if (saved) root.dataset.theme = saved;

  const isDark = () => (root.dataset.theme ?? (system.matches ? "dark" : "light")) === "dark";

  addEventListener("DOMContentLoaded", () => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";

    const update = () => {
      const dark = isDark();
      button.replaceChildren(createElement(dark ? Sun : Moon));
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };

    button.addEventListener("click", () => {
      root.dataset.theme = isDark() ? "light" : "dark";
      const live = location.hostname === domain || location.hostname.endsWith(`.${domain}`);
      document.cookie = `theme=${root.dataset.theme}; max-age=31536000; path=/; samesite=lax${live ? `; domain=${domain}; secure` : ""}`;
      update();
    });
    system.addEventListener("change", update);

    update();
    document.body.append(button);
  });
})();
