// Every page's Markdown by its path: its file in content/, or for a nav entry with `from` a doc of another project,
// such as "hmi/reference.md". A link between two docs read this way goes to the other's page here.
// Rewritten here and not in generate, so the plain text copies and the link check see the same links.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { branchFile } from "./source.mjs";

// Each project's docs folder on its default branch, so a change shows on the next deploy with no release.
// HMI_SOURCE=../hmi-rant reads a checkout instead.
const projects = {
  hmi: (doc) => branchFile("KosmosisDire/rant-hmi", `docs/${doc}`, "HMI_SOURCE"),
};

export async function loadPages(contentDir) {
  const groups = JSON.parse(readFileSync(join(contentDir, "nav.json"), "utf8"));
  const pages = groups.flatMap((g) => g.pages);
  const here = new Map(pages.filter((p) => p.from).map((p) => [p.from, p]));
  const sources = new Map();
  for (const p of pages) {
    if (!p.from) {
      // a page with no file is left for validate to report
      const file = join(contentDir, `${p.path}.md`);
      if (existsSync(file)) sources.set(p.path, readFileSync(file, "utf8"));
      continue;
    }
    const at = p.from.indexOf("/");
    const [project, doc] = [p.from.slice(0, at), p.from.slice(at + 1)];
    if (!projects[project]) throw new Error(`nav.json: "${p.from}" names no project this site reads`);
    const text = await projects[project](doc);
    // a link that reads as the file it names reads as that page's title here
    const relinked = text.replace(/\[([^\]]*)\]\(([\w-]+\.md)(#[^)]*)?\)/g, (all, label, other, anchor = "") => {
      const page = here.get(`${project}/${other}`);
      return page ? `[${label === other ? page.title : label}](/${page.path}${anchor})` : all;
    });
    sources.set(p.path, relinked);
  }
  return { groups, pages, sources };
}
