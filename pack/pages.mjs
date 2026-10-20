// Write the package viewer: the list of packages, and a right sidebar that shows the one picked with its README.
import { Marked } from "marked";
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "../docs/generate.mjs";
import { loadPackages } from "./database.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const attr = (s) => escapeHtml(s).replace(/"/g, "&quot;");
const link = (href, text) => `<a href="${attr(href)}">${escapeHtml(text)}</a>`;

// A README as GitHub shows it at the release's tag. Raw HTML is dropped, so no package can run a script on this site,
// and relative links and images lead to the repo.
function readmeHtml(p) {
  const { path, text } = p.readme;
  const dir = path.slice(0, path.lastIndexOf("/") + 1);
  const resolve = (href, image) => {
    const root = image ? `https://raw.githubusercontent.com/${p.repo}/${p.tag}/` : `https://github.com/${p.repo}/blob/${p.tag}/`;
    try {
      const url = href.startsWith("#") ? new URL(path + href, root) : href.startsWith("/") ? new URL(href.slice(1), root) : new URL(href, root + dir);
      return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : undefined;
    } catch {
      return undefined;
    }
  };
  const marked = new Marked({
    renderer: {
      html: () => "",
      // The package's name heads the sidebar, so the README's headings sit below it.
      heading({ tokens, depth }) {
        const level = Math.min(depth + 2, 6);
        return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>`;
      },
      link({ href, tokens }) {
        const url = resolve(href, false);
        const text = this.parser.parseInline(tokens);
        return url ? `<a href="${attr(url)}">${text}</a>` : text;
      },
      image({ href, text }) {
        const url = resolve(href, true);
        return url ? `<img src="${attr(url)}" alt="${attr(text)}" loading="lazy">` : "";
      },
    },
  });
  return `<div class="readme">${marked.parse(text)}</div>`;
}

const row = (p) =>
  `<a href="#${p.name}" data-package="${p.name}"><span class="name">${p.name}</span><span class="version">${p.version ?? ""}</span><span class="description">${escapeHtml(p.description || p.problem)}</span></a>`;

// build.mjs puts the copy button in place of <!--copy-->.
function details(p) {
  const facts = [
    p.version && ["Version", link(p.release, p.version)],
    p.date && ["Released", p.date],
    p.platforms?.length && ["Platforms", escapeHtml(p.platforms.join(", "))],
    p.vsix && ["Editor", "VS Code, or another with <code>--editor</code>"],
    p.nodes?.length && ["Nodes", p.nodes.map((n) => `<code>${escapeHtml(n)}</code>`).join(", ")],
    ["Source", link(`https://github.com/${p.repo}`, p.repo)],
  ].filter(Boolean);
  return [
    `<section data-package="${p.name}" hidden>`,
    `<h2>${p.name}</h2>`,
    p.description && `<p class="lead">${escapeHtml(p.description)}</p>`,
    p.problem
      ? `<p class="problem">${escapeHtml(p.problem)} <code>rant install</code> cannot install it until a release fixes that.</p>`
      : `<div class="code-block"><code>rant install ${p.name}</code><!--copy--></div>`,
    `<dl class="facts">${facts.map(([term, value]) => `<dt>${term}</dt><dd>${value}</dd>`).join("")}</dl>`,
    p.readme && readmeHtml(p),
    "</section>",
  ].filter(Boolean).join("");
}

export async function pages(out) {
  const packages = await loadPackages();
  for (const p of packages.filter((p) => p.problem)) console.warn(`pack: ${p.name}: ${p.problem}`);
  const values = { list: packages.map(row).join(""), details: packages.map(details).join("") };
  // A function, so a $ in the content is not read as a replacement pattern.
  const html = readFileSync(join(here, "page.html"), "utf8").replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
  // Any other address shows the list too.
  for (const file of ["index.html", "404.html"]) writeFileSync(join(out, file), html);
}
