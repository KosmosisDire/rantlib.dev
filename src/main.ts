import { initCopy } from "./copy";
import { localizeLinks } from "./sites";

const tabs = [...document.querySelectorAll<HTMLButtonElement>(".install [role=tab]")];

function select(tab: HTMLButtonElement, focus = false) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")!)!.hidden = !on;
  }
  if (focus) tab.focus();
}

for (const tab of tabs) {
  tab.addEventListener("click", () => select(tab));
  tab.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    select(tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length]!, true);
  });
}

if (navigator.userAgent.includes("Windows")) select(document.getElementById("tab-windows") as HTMLButtonElement);

initCopy(document.querySelector<HTMLButtonElement>(".install .copy")!, () => document.querySelector(".install pre:not([hidden]) code")!.textContent ?? "");

// The release the install scripts pick. Without an answer the heading stays as it is.
fetch("https://api.github.com/repos/KosmosisDire/rant-cli/releases/latest")
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((release: { tag_name: string }) => (document.getElementById("version")!.textContent = release.tag_name))
  .catch(() => {});

localizeLinks();
