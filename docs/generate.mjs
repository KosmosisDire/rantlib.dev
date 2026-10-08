// Write the plain text copies of the docs that tools can fetch without running the page.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function generate(contentDir, outDir, origin) {
  const groups = JSON.parse(readFileSync(join(contentDir, "nav.json"), "utf8"));
  const pages = groups.flatMap((g) => g.pages);
  const paths = new Set(pages.map((p) => p.path));

  // In these copies, links between pages point at the Markdown too, so following them stays plain text.
  const toMarkdownLinks = (text) =>
    text.replace(/\]\(\/([a-z0-9-]+)(#[^)]*)?\)/g, (all, path, anchor = "") =>
      paths.has(path) ? `](/${path}.md${anchor})` : all,
    );

  const full = [];
  for (const page of pages) {
    const text = toMarkdownLinks(readFileSync(join(contentDir, `${page.path}.md`), "utf8"));
    writeFileSync(join(outDir, `${page.path}.md`), text);
    full.push(text.trim());
  }
  writeFileSync(join(outDir, "llms-full.txt"), full.join("\n\n---\n\n") + "\n");

  const list = groups
    .map((g) => `## ${g.title}\n\n${g.pages.map((p) => `- [${p.title}](${origin}/${p.path}.md)`).join("\n")}`)
    .join("\n\n");
  writeFileSync(
    join(outDir, "llms.txt"),
    `# RANT\n\n> Robotics Automation Networking Toolkit. Documentation.\n\nEvery page is plain Markdown at its address plus .md. All pages in one file: ${origin}/llms-full.txt\n\n${list}\n`,
  );

  // The page draws itself in the browser, so what a plain fetch sees is this list.
  const links = pages.map((p) => `<li><a href="/${p.path}">${p.title}</a> (<a href="/${p.path}.md">Markdown</a>)</li>`).join("");
  const html = readFileSync(join(outDir, "index.html"), "utf8").replace(
    "<!--static-->",
    `<h1>RANT documentation</h1><p>This site draws its pages in the browser. For plain text use <a href="/llms.txt">/llms.txt</a> or <a href="/llms-full.txt">/llms-full.txt</a>, or add .md to any page address.</p><ul>${links}</ul>`,
  );
  writeFileSync(join(outDir, "index.html"), html);
}
