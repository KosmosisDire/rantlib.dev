import { initCodeBlocks } from "../../src/copy";
import { localizeLinks } from "../../src/sites";
import { initSearch } from "./search";

localizeLinks();
initCodeBlocks();

// A link to a type opens its dropdown, which would otherwise hide what the link points at.
const openTarget = (hash: string) => {
  const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  if (target instanceof HTMLDetailsElement) target.open = true;
};
openTarget(location.hash);
addEventListener("hashchange", () => openTarget(location.hash));
// Following a link to the hash already in the address bar fires no hashchange.
document.addEventListener("click", (e) => {
  const link = (e.target as Element).closest("a");
  if (link?.pathname === location.pathname) openTarget(link.hash);
});

initSearch({
  input: document.getElementById("search") as HTMLInputElement,
  results: document.getElementById("results")!,
});
