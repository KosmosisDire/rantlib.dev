import { Lexer } from "marked";
import { slug } from "../slug.mjs";

interface Entry {
  path: string;
  page: string;
  heading: string;
  id: string;
  text: string;
}

interface Options {
  input: HTMLInputElement;
  results: HTMLElement;
  pages: { title: string; path: string }[];
  load: (path: string) => Promise<string>;
  go: (url: string) => void;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termsOf = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean);

// One entry per heading, holding the plain text under it.
function sections(path: string, page: string, markdown: string): Entry[] {
  const entries: Entry[] = [];
  let entry: Entry | undefined;
  for (const token of Lexer.lex(markdown)) {
    if (token.type === "heading") {
      entry = { path, page, heading: token.text, id: slug(token.text), text: "" };
      entries.push(entry);
    } else if (entry && token.type !== "space") {
      entry.text += " " + token.raw.replace(/[`*_>#|[\]()]/g, " ").replace(/\s+/g, " ");
    }
  }
  return entries;
}

function snippet(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  const hits = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0);
  const at = hits.length ? Math.min(...hits) : 0;
  let html = escapeHtml(text.slice(Math.max(0, at - 30), at + 90).trim());
  for (const term of terms) html = html.replace(new RegExp(escapeRegex(escapeHtml(term)), "gi"), "<mark>$&</mark>");
  return html;
}

export function initSearch({ input, results, pages, load, go }: Options) {
  let index: Promise<Entry[]> | undefined;
  let found: Entry[] = [];
  let active = 0;

  const loadIndex = () =>
    (index ??= Promise.all(pages.map(async (p) => sections(p.path, p.title, await load(p.path)))).then((all) => all.flat()));

  function render() {
    const terms = termsOf(input.value);
    results.innerHTML = found.length
      ? found
          .map(
            (e, i) =>
              `<a href="/${e.path}#${e.id}" class="${i === active ? "active" : ""}"><b>${escapeHtml(e.page)} / ${escapeHtml(e.heading)}</b><span>${snippet(e.text, terms)}</span></a>`,
          )
          .join("")
      : "<p>No results</p>";
  }

  async function search() {
    const terms = termsOf(input.value);
    document.body.classList.toggle("searching", terms.length > 0);
    if (!terms.length) return;
    const entries = await loadIndex();
    // A newer keystroke already replaced this query.
    if (termsOf(input.value).join(" ") !== terms.join(" ")) return;
    found = entries
      .flatMap((e) => {
        const heading = e.heading.toLowerCase();
        const text = e.text.toLowerCase();
        if (!terms.every((t) => heading.includes(t) || text.includes(t))) return [];
        const score = terms.reduce((s, t) => s + (heading.includes(t) ? 10 : 0) + (text.includes(t) ? 1 : 0), 0);
        return [{ e, score }];
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((r) => r.e);
    active = 0;
    render();
  }

  function clear() {
    input.value = "";
    document.body.classList.remove("searching");
  }

  input.addEventListener("input", () => void search());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clear();
      input.blur();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + found.length) % Math.max(found.length, 1);
      render();
    } else if (e.key === "Enter" && found[active]) {
      go(`/${found[active].path}#${found[active].id}`);
      clear();
    }
  });

  // The page's link handling does the navigation, so only clear the box.
  results.addEventListener("click", clear);

  addEventListener("keydown", (e) => {
    if (e.key === "/" && !(document.activeElement instanceof HTMLInputElement)) {
      e.preventDefault();
      input.focus();
    }
  });
}
