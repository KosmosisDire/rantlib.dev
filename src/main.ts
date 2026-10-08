import { localizeLinks } from "./sites";

const tabs = [...document.querySelectorAll<HTMLButtonElement>(".install [role=tab]")];
const copy = document.querySelector<HTMLButtonElement>(".install .copy")!;

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

let reset = 0;
copy.addEventListener("click", async () => {
  const code = document.querySelector(".install pre:not([hidden]) code")!;
  await navigator.clipboard.writeText(code.textContent ?? "");
  copy.classList.add("done");
  copy.setAttribute("aria-label", "Copied");
  clearTimeout(reset);
  reset = setTimeout(() => {
    copy.classList.remove("done");
    copy.setAttribute("aria-label", "Copy command");
  }, 1500);
});

localizeLinks();
