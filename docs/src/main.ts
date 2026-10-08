import { Marked } from "marked";
import { slug } from "../slug.mjs";
import { localizeLinks } from "../../src/sites";
import { highlight } from "./highlight";
import { initSearch } from "./search";

interface Group {
  title: string;
  pages: { title: string; path: string }[];
}

const nav = document.getElementById("nav")!;
const content = document.getElementById("content")!;

const cache = new Map<string, Promise<string>>();
const load = (path: string) => {
  if (!cache.has(path)) cache.set(path, fetch(`/content/${path}.md`).then((r) => r.text()));
  return cache.get(path)!;
};

const marked = new Marked({
  renderer: {
    code({ text, lang }) {
      const html = highlight(text, lang ?? "");
      return html || `<pre><code>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>`;
    },
    heading({ tokens, depth, text }) {
      return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>`;
    },
  },
});

const groups: Group[] = await (await fetch("/content/nav.json")).json();
const pages = groups.flatMap((g) => g.pages);

nav.innerHTML = groups
  .map(
    (g) =>
      `<h2>${g.title}</h2>` + g.pages.map((p) => `<a href="/${p.path}" data-path="${p.path}">${p.title}</a>`).join(""),
  )
  .join("");

localizeLinks();

let current = "";

async function show(path: string, hash: string) {
  const page = pages.find((p) => p.path === path);
  if (!page) {
    content.innerHTML = "<h1>Not found</h1><p>There is no such page.</p>";
    document.title = "Not found | RANT Docs";
  } else if (path !== current) {
    content.innerHTML = await marked.parse(await load(path));
    localizeLinks(content);
    document.title = `${page.title} | RANT Docs`;
    window.scrollTo(0, 0);
  }
  current = path;
  for (const a of nav.querySelectorAll<HTMLAnchorElement>("a")) {
    a.classList.toggle("current", a.dataset.path === path);
  }
  if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
}

function route() {
  const path = location.pathname.replace(/^\/|\/$/g, "");
  if (!path) {
    history.replaceState(null, "", `/${pages[0]!.path}`);
    return show(pages[0]!.path, "");
  }
  return show(path, location.hash);
}

function go(url: string) {
  history.pushState(null, "", url);
  void route();
}

initSearch({
  input: document.getElementById("search") as HTMLInputElement,
  results: document.getElementById("results")!,
  pages,
  load,
  go,
});

// Links inside the site change the page in place and only update the address.
document.addEventListener("click", (e) => {
  const link = (e.target as Element).closest("a");
  if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || link.target) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  if (url.pathname !== location.pathname) history.pushState(null, "", url.pathname + url.hash);
  else history.replaceState(null, "", url.pathname + url.hash);
  void route();
});

addEventListener("popstate", () => void route());
await route();
