// Check the docs before a build: nav against files, then every link and anchor. Returns the problems.
import { Lexer } from "marked";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { slug } from "./slug.mjs";

export function validate(contentDir) {
  const errors = [];
  const nav = JSON.parse(readFileSync(join(contentDir, "nav.json"), "utf8"));
  const paths = nav.flatMap((group) => group.pages.map((page) => page.path));
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));

  for (const path of paths) {
    if (paths.indexOf(path) !== paths.lastIndexOf(path)) errors.push(`nav.json: "${path}" is listed twice`);
    if (!files.includes(path)) errors.push(`nav.json: "${path}" has no ${path}.md`);
  }
  for (const file of files) {
    if (!paths.includes(file)) errors.push(`${file}.md is not listed in nav.json`);
  }

  // Parse every page once: its heading ids and its links.
  const pages = new Map();
  for (const path of paths.filter((p) => files.includes(p))) {
    const ids = new Set();
    const links = [];
    const walk = (tokens) => {
      for (const token of tokens) {
        if (token.type === "heading") {
          const id = slug(token.text);
          if (ids.has(id)) errors.push(`${path}.md: two headings share the anchor #${id}`);
          ids.add(id);
        }
        if (token.type === "link") links.push(token.href);
        walk(token.tokens ?? []);
        for (const item of token.items ?? []) walk(item.tokens ?? []);
      }
    };
    walk(Lexer.lex(readFileSync(join(contentDir, `${path}.md`), "utf8")));
    pages.set(path, { ids, links });
  }

  for (const [path, { links }] of pages) {
    for (const href of links) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      if (!href.startsWith("/") && !href.startsWith("#")) {
        errors.push(`${path}.md: link "${href}" must start with / or #`);
        continue;
      }
      const [target, anchor] = href.split("#");
      const targetPath = target ? target.slice(1) : path;
      const page = pages.get(targetPath);
      if (!page) errors.push(`${path}.md: link "${href}" goes to a page that does not exist`);
      else if (anchor && !page.ids.has(anchor)) errors.push(`${path}.md: link "${href}" has no heading #${anchor} on that page`);
    }
  }

  return errors;
}
