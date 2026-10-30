// Write the built docs: an HTML page per doc, plus the plain text copies that tools can fetch.
import { Marked } from "marked";
import { bundledLanguages, createCssVariablesTheme, createHighlighter } from "shiki";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { slug } from "./slug.mjs";
import { statement, typeNames } from "./types.mjs";

export const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Console output may hold the CLI's color codes. The plain text copies and the search index drop them.
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

// Colors come from --shiki-* variables in style.css.
const theme = createCssVariablesTheme({ name: "rant", variablePrefix: "--shiki-" });

// The CLI's colors (cli-rant/src/ui/output.cpp) are for dark terminals. Each keeps its value in dark mode and gets a darker shade in light mode.
const cliColors = {
  "#9a9a9a": "#6b6666",
  "#646464": "#a09a9a",
  "#dc3853": "#dc3853",
  "#37885f": "#2f7a52",
  "#5ca67d": "#2f7a52",
  "#cf9a3a": "#8a5a00",
  "#d2574b": "#c0392b",
};
const colorReplacements = Object.fromEntries(Object.entries(cliColors).map(([dark, light]) => [dark, `light-dark(${light}, ${dark})`]));

const spanHtml = (t) => `<span style="color:${t.color}${t.fontStyle & 2 ? ";font-weight:bold" : ""}">${escapeHtml(t.content)}</span>`;

// One search entry per heading, holding the plain text under it, and one per standard type.
function sections(page, tokens, types) {
  const entries = [];
  let entry;
  for (const token of tokens) {
    if (token.type === "heading") {
      entry = { path: page.path, page: page.title, heading: token.text, id: slug(token.text), text: "" };
      entries.push(entry);
    } else if (token.type === "code" && token.lang === "types") {
      for (const t of typeNames(token.text).map((name) => types.get(name))) {
        const fields = (t.fields ?? []).map((f) => `${f.name} ${f.note ?? ""}`);
        entries.push({ path: page.path, page: page.title, heading: t.name, id: t.id, text: [t.summary, t.details, ...fields].join(" ") });
      }
    } else if (entry && token.type !== "space") {
      entry.text += " " + stripAnsi(token.raw).replace(/[`*_>#|[\]()]/g, " ").replace(/\s+/g, " ");
    }
  }
  return entries;
}

// `docs` is what loadPages read: the nav's groups, each page in them and its Markdown.
export async function generate(contentDir, templateFile, outDir, origin, types, docs) {
  const { groups, pages, sources } = docs;
  const paths = new Set(pages.map((p) => p.path));

  const codeHtml = (text, lang) => {
    if (lang && shiki.getLoadedLanguages().includes(lang)) return shiki.codeToHtml(text, { lang, theme: "rant" });
    return `<pre><code>${escapeHtml(text)}</code></pre>`;
  };
  // build.mjs puts the copy button in place of <!--copy-->. It copies the block just before it.
  const copyable = (pre) => `<div class="code-block">${pre}<!--copy--></div>`;

  // A console block: lines that start with "$ " are commands and the rest is their output, colored by its ANSI codes.
  // Each run of commands is its own copyable part, set apart from the output, which is never copied.
  const consoleHtml = (text) => {
    const runs = [];
    for (const line of text.split("\n")) {
      const command = line.startsWith("$ ");
      if (runs.at(-1)?.command !== command) runs.push({ command, lines: [] });
      runs.at(-1).lines.push(command ? line.slice(2) : line);
    }
    const lines = (text, lang, wrap = (s) => s) =>
      shiki
        .codeToTokensBase(text, { lang, theme: "rant", colorReplacements })
        .map((tokens) => wrap(tokens.map(spanHtml).join("")))
        .join("\n");
    const parts = runs.map(({ command, lines: run }) =>
      command
        ? copyable(`<pre><code>${lines(run.join("\n"), "sh", (s) => `<span class="command">${s}</span>`)}</code></pre>`)
        : `<pre class="output"><code>${lines(run.join("\n"), "ansi")}</code></pre>`,
    );
    return `<div class="console">${parts.join("")}</div>`;
  };

  // A types block names standard types. Each is a dropdown that opens to a row per field, or per option of an enum.
  const typeRef = (type) => {
    const base = type.replace(/[<[].*$/, "");
    return typePages.has(base) ? `<a href="/${typePages.get(base)}#${slug(base)}">${base}</a>${escapeHtml(type.slice(base.length))}` : escapeHtml(type);
  };
  const typeHtml = (t) => {
    const options = t.alias?.options;
    const rows = options
      ? options.map((o) => ({ name: o.name, type: String(o.value), unit: o.unit, note: o.note }))
      : (t.alias ? [t.alias] : t.fields).map((f) => ({ name: f.name, type: typeRef(f.type), unit: f.unit, note: f.note }));
    const columns = [
      options ? ["Option", (r) => `<code>${r.name}</code>`] : !t.alias && ["Field", (r) => `<code>${r.name}</code>`],
      [options ? "Value" : "Type", (r) => `<code>${r.type}</code>`],
      rows.some((r) => r.unit) && ["Unit", (r) => escapeHtml(r.unit ?? "")],
      rows.some((r) => r.note) && ["Note", (r) => escapeHtml(r.note ?? "")],
    ].filter(Boolean);
    const head = `<tr>${columns.map(([title]) => `<th>${title}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr>${columns.map(([, cell]) => `<td>${cell(r)}</td>`).join("")}</tr>`).join("");
    const details = t.details ? `<p>${escapeHtml(t.details)}</p>` : "";
    const table = rows.length ? `<table><thead>${head}</thead><tbody>${body}</tbody></table>` : "<p>No fields.</p>";
    return `<details class="type" id="${t.id}"><summary><code>${t.name}</code><span>${escapeHtml(t.summary)}</span></summary><div>${details}${table}</div></details>`;
  };
  const typesHtml = (text) => `<div class="types">${typeNames(text).map((name) => typeHtml(types.get(name))).join("")}</div>`;

  const marked = new Marked({
    renderer: {
      code({ text, lang }) {
        if (lang === "types") return typesHtml(text);
        return lang === "console" ? consoleHtml(text) : copyable(codeHtml(text, lang));
      },
      heading({ tokens, depth, text }) {
        return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>`;
      },
    },
  });
  const tokens = new Map(pages.map((p) => [p.path, marked.lexer(sources.get(p.path))]));

  // Only the languages the pages use, since loading every grammar is slow.
  const langs = new Set();
  marked.walkTokens([...tokens.values()].flat(), (token) => {
    if (token.type === "code" && token.lang === "console") langs.add("sh").add("ansi");
    else if (token.type === "code" && token.lang in bundledLanguages) langs.add(token.lang);
  });
  const shiki = await createHighlighter({ themes: [theme], langs: [...langs] });

  // The page each standard type is listed on, for the links between types.
  const typePages = new Map();
  for (const p of pages) {
    marked.walkTokens(tokens.get(p.path), (token) => {
      if (token.type === "code" && token.lang === "types") for (const name of typeNames(token.text)) typePages.set(name, p.path);
    });
  }

  const template = readFileSync(templateFile, "utf8");
  const nav = (current) =>
    groups
      .map((g) => `<h2>${g.title}</h2>` + g.pages.map((p) => `<a href="/${p.path}"${p.path === current ? ' class="current"' : ""}>${p.title}</a>`).join(""))
      .join("");
  // A function, so a $ in the content is not read as a replacement pattern.
  const page = (values) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);

  // Images and other files sit beside the pages in content/ and keep their paths, so relative links work in the site and the .md copies.
  cpSync(contentDir, outDir, { recursive: true, filter: (src) => !src.endsWith(".md") && basename(src) !== "nav.json" });

  for (const p of pages) {
    const content = marked.parser(tokens.get(p.path));
    writeFileSync(join(outDir, `${p.path}.html`), page({ title: `${p.title} | RANT Docs`, nav: nav(p.path), content }));
  }
  writeFileSync(join(outDir, "404.html"), page({ title: "Not found | RANT Docs", nav: nav(""), content: "<h1>Not found</h1><p>There is no such page.</p>" }));
  writeFileSync(join(outDir, "_redirects"), `/ /${pages[0].path} 302\n`);
  writeFileSync(join(outDir, "search.json"), JSON.stringify(pages.flatMap((p) => sections(p, tokens.get(p.path), types))));

  // In these copies, links between pages point at the Markdown too, so following them stays plain text.
  const toMarkdownLinks = (text) =>
    text.replace(/\]\(\/([a-z0-9-]+)(#[^)]*)?\)/g, (all, path, anchor = "") =>
      paths.has(path) ? `](/${path}.md${anchor})` : all,
    );

  // A types block becomes the definitions it names.
  const expandTypes = (text) =>
    text.replace(/^```types\r?\n([\s\S]*?)^```/gm, (_, list) => "```\n" + typeNames(list).map((name) => statement(types.get(name))).join("\n\n") + "\n```");

  const full = [];
  for (const p of pages) {
    const text = expandTypes(toMarkdownLinks(stripAnsi(sources.get(p.path))));
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
