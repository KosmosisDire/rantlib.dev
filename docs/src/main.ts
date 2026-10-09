import { localizeLinks } from "../../src/sites";
import { initSearch } from "./search";

interface Group {
  title: string;
  pages: { title: string; path: string }[];
}

localizeLinks();

const cache = new Map<string, Promise<string>>();
const load = (path: string) => {
  if (!cache.has(path)) cache.set(path, fetch(`/content/${path}.md`).then((r) => r.text()));
  return cache.get(path)!;
};

const groups: Group[] = await (await fetch("/content/nav.json")).json();

initSearch({
  input: document.getElementById("search") as HTMLInputElement,
  results: document.getElementById("results")!,
  pages: groups.flatMap((g) => g.pages),
  load,
});
