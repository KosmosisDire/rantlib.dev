// Write the built docs: an HTML page per doc, plus the plain text copies that tools can fetch.
import { Lexer, Marked } from "marked";
import { bundledLanguages, createCssVariablesTheme, createHighlighter } from "shiki";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { slug } from "./slug.mjs";

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Colors come from --shiki-* variables in style.css.
const theme = createCssVariablesTheme({ name: "rant", variablePrefix: "--shiki-" });

// Only the languages the pages use, since loading every grammar is slow.
function languages(markdowns) {
  const found = new Set();
  new Marked().walkTokens(markdowns.flatMap((m) => Lexer.lex(m)), (token) => {
    if (token.type === "code" && token.lang in bundledLanguages) found.add(token.lang);
  });
  return [...found];
}

export async function generate(contentDir, templateFile, outDir, origin) {
  const groups = JSON.parse(readFileSync(join(contentDir, "nav.json"), "utf8"));
  const pages = groups.flatMap((g) => g.pages);
  const paths = new Set(pages.map((p) => p.path));
  const sources = new Map(pages.map((p) => [p.path, readFileSync(join(contentDir, `${p.path}.md`), "utf8")]));

  const shiki = await createHighlighter({ themes: [theme], langs: languages([...sources.values()]) });
  const marked = new Marked({
    renderer: {
      code({ text, lang }) {
        if (lang && shiki.getLoadedLanguages().includes(lang)) return shiki.codeToHtml(text, { lang, theme: "rant" });
        return `<pre><code>${escapeHtml(text)}</code></pre>`;
      },
      heading({ tokens, depth, text }) {
        return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>`;
      },
    },
  });

  const template = readFileSync(templateFile, "utf8");
  const nav = (current) =>
    groups
      .map((g) => `<h2>${g.title}</h2>` + g.pages.map((p) => `<a href="/${p.path}"${p.path === current ? ' class="current"' : ""}>${p.title}</a>`).join(""))
      .join("");
  // A function, so a $ in the content is not read as a replacement pattern.
  const page = (values) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);

  for (const p of pages) {
    const content = marked.parse(sources.get(p.path));
    writeFileSync(join(outDir, `${p.path}.html`), page({ title: `${p.title} | RANT Docs`, nav: nav(p.path), content }));
  }
  writeFileSync(join(outDir, "404.html"), page({ title: "Not found | RANT Docs", nav: nav(""), content: "<h1>Not found</h1><p>There is no such page.</p>" }));
  writeFileSync(join(outDir, "_redirects"), `/ /${pages[0].path} 302\n`);

  // In these copies, links between pages point at the Markdown too, so following them stays plain text.
  const toMarkdownLinks = (text) =>
    text.replace(/\]\(\/([a-z0-9-]+)(#[^)]*)?\)/g, (all, path, anchor = "") =>
      paths.has(path) ? `](/${path}.md${anchor})` : all,
    );

  const full = [];
  for (const p of pages) {
    const text = toMarkdownLinks(sources.get(p.path));
    writeFileSync(join(outDir, `${p.path}.md`), text);
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
}
