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

const search = document.querySelector<HTMLInputElement>(".filter input")!;
const filter = search.parentElement!;
const empty = document.querySelector<HTMLElement>(".empty")!;

// A row stays when it holds every word typed, in its name, version or description.
function applyFilter() {
  const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
  for (const r of rows) r.hidden = !words.every((w) => r.textContent!.toLowerCase().includes(w));
  empty.hidden = rows.some((r) => !r.hidden);
  filter.classList.toggle("typed", search.value !== "");
}

function clear() {
  search.value = "";
  applyFilter();
}

search.addEventListener("input", applyFilter);
search.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && search.value) {
    e.stopPropagation();
    clear();
  }
});
filter.querySelector(".close")!.addEventListener("click", () => {
  clear();
  search.focus();
});

addEventListener("hashchange", show);
details.querySelector(".close")!.addEventListener("click", close);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && details.classList.contains("open")) close();
});
show();
