import { initCodeBlocks } from "../../src/copy";
import { localizeLinks } from "../../src/sites";

localizeLinks();
initCodeBlocks();

// The page is built at deploy, so how long ago is counted here, as 3 days ago. The built text stays as the tooltip.
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536e6], ["month", 2592e6], ["week", 6048e5], ["day", 864e5], ["hour", 36e5], ["minute", 6e4]];
for (const time of document.querySelectorAll<HTMLTimeElement>(".facts time")) {
  const ago = Date.now() - Date.parse(time.dateTime);
  const [unit, length] = units.find(([, length]) => ago >= length) ?? units[units.length - 1];
  time.title = time.textContent!;
  time.textContent = relative.format(-Math.floor(ago / length), unit);
}

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

// The address keeps the category picked, as ?category=libraries. None is All.
const buttons = [...document.querySelectorAll<HTMLButtonElement>(".categories button")];
const named = new URLSearchParams(location.search).get("category") ?? "";
let category = buttons.some((b) => b.dataset.category === named) ? named : "";

function pick(key: string) {
  category = key;
  for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.category === key));
  const url = new URL(location.href);
  if (key) url.searchParams.set("category", key);
  else url.searchParams.delete("category");
  history.replaceState(null, "", url);
  applyFilter();
}

for (const b of buttons) b.addEventListener("click", () => pick(b.dataset.category!));

// A row stays when it is in the category picked and holds every word typed, in its name, version or description.
function applyFilter() {
  const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
  for (const r of rows)
    r.hidden = (category !== "" && r.dataset.category !== category) || !words.every((w) => r.textContent!.toLowerCase().includes(w));
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
pick(category);
show();
