// Check the docs before a build: nav against files, then every link, anchor, image and standard type. Returns the problems.
import { Lexer } from "marked";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { slug } from "./slug.mjs";
import { typeNames } from "./types.mjs";

// `docs` is what loadPages read: each page in nav.json and its Markdown.
export function validate(contentDir, types, docs) {
  const errors = [];
  const paths = docs.pages.map((page) => page.path);
  const local = docs.pages.filter((page) => !page.from).map((page) => page.path);
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
  // where a problem is: the file in content/, or the doc read from a release
  const where = new Map(docs.pages.map((page) => [page.path, page.from ?? `${page.path}.md`]));

  for (const path of paths) {
    if (paths.indexOf(path) !== paths.lastIndexOf(path)) errors.push(`nav.json: "${path}" is listed twice`);
  }
  for (const path of local) {
    if (!files.includes(path)) errors.push(`nav.json: "${path}" has no ${path}.md`);
  }
  for (const file of files) {
    if (!local.includes(file)) errors.push(`${file}.md is not listed in nav.json`);
  }

  // Parse every page once: its heading and type ids and its links. Each standard type is listed on one page.
  const pages = new Map();
  const listed = new Map();
  for (const path of paths.filter((p) => docs.sources.has(p))) {
    const ids = new Set();
    const links = [];
    const images = [];
    const anchor = (id) => {
      if (ids.has(id)) errors.push(`${where.get(path)}: two headings or types share the anchor #${id}`);
      ids.add(id);
    };
    const walk = (tokens) => {
      for (const token of tokens) {
        if (token.type === "heading") anchor(slug(token.text));
        if (token.type === "code" && token.lang === "types") {
          for (const name of typeNames(token.text)) {
            if (!types.has(name)) errors.push(`${where.get(path)}: ${name} is not a standard type`);
            else if (listed.has(name)) errors.push(`${where.get(path)}: ${name} is already listed in ${where.get(listed.get(name))}`);
            else {
              listed.set(name, path);
              anchor(types.get(name).id);
            }
          }
        }
        if (token.type === "link") links.push(token.href);
        if (token.type === "image") images.push(token.href);
        walk(token.tokens ?? []);
        for (const item of token.items ?? []) walk(item.tokens ?? []);
      }
    };
    walk(Lexer.lex(docs.sources.get(path)));
    pages.set(path, { ids, links });

    // An image is a remote URL or a path relative to content/, which is where the page is served from.
    for (const src of images) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(src)) continue;
      if (src.startsWith("/")) errors.push(`${where.get(path)}: image "${src}" must be a path relative to content/`);
      else if (!existsSync(join(contentDir, src))) errors.push(`${where.get(path)}: image "${src}" is not in content/`);
    }
  }

  for (const name of types.keys()) {
    if (!listed.has(name)) errors.push(`standard type ${name} is in no types block`);
  }

  for (const [path, { links }] of pages) {
    for (const href of links) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      if (!href.startsWith("/") && !href.startsWith("#")) {
        errors.push(`${where.get(path)}: link "${href}" must start with / or #`);
        continue;
      }
      const [target, anchor] = href.split("#");
      const targetPath = target ? target.slice(1) : path;
      const page = pages.get(targetPath);
      if (!page) errors.push(`${where.get(path)}: link "${href}" goes to a page that does not exist`);
      else if (anchor && !page.ids.has(anchor)) errors.push(`${where.get(path)}: link "${href}" has no heading #${anchor} on that page`);
    }
  }

  return errors;
}
