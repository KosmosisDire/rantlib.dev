import { initCodeBlocks } from "../../src/copy";
import { localizeLinks } from "../../src/sites";

localizeLinks();
initCodeBlocks();

const rows = [...document.querySelectorAll<HTMLAnchorElement>(".packages a")];
const details = document.querySelector<HTMLElement>(".details")!;
const sections = [...details.querySelectorAll<HTMLElement>("section")];
const body = details.querySelector<HTMLElement>(".body")!;

// The address names the package shown, as #explorer. Without one the sidebar closes and keeps its last package
// while it slides away.
function show() {
  const name = decodeURIComponent(location.hash.slice(1));
  const open = sections.some((s) => s.dataset.package === name);
  if (open) {
    for (const s of sections) s.hidden = s.dataset.package !== name;
    body.scrollTop = 0;
  }
  for (const r of rows) r.toggleAttribute("aria-current", r.dataset.package === name);
  details.classList.toggle("open", open);
  details.inert = !open;
}

function close() {
  history.pushState(null, "", location.pathname + location.search);
  show();
}

addEventListener("hashchange", show);
details.querySelector(".close")!.addEventListener("click", close);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && details.classList.contains("open")) close();
});
show();
