// Check the docs before a build: nav against files, then every link, anchor, image and standard type. Returns the problems.
import { Lexer } from "marked";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { slug } from "./slug.mjs";
import { typeNames } from "./types.mjs";

export function validate(contentDir, types) {
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

  // Parse every page once: its heading and type ids and its links. Each standard type is listed on one page.
  const pages = new Map();
  const listed = new Map();
  for (const path of paths.filter((p) => files.includes(p))) {
    const ids = new Set();
    const links = [];
    const images = [];
    const anchor = (id) => {
      if (ids.has(id)) errors.push(`${path}.md: two headings or types share the anchor #${id}`);
      ids.add(id);
    };
    const walk = (tokens) => {
      for (const token of tokens) {
        if (token.type === "heading") anchor(slug(token.text));
        if (token.type === "code" && token.lang === "types") {
          for (const name of typeNames(token.text)) {
            if (!types.has(name)) errors.push(`${path}.md: ${name} is not a standard type`);
            else if (listed.has(name)) errors.push(`${path}.md: ${name} is already listed in ${listed.get(name)}.md`);
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
    walk(Lexer.lex(readFileSync(join(contentDir, `${path}.md`), "utf8")));
    pages.set(path, { ids, links });

    // An image is a remote URL or a path relative to content/, which is where the page is served from.
    for (const src of images) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(src)) continue;
      if (src.startsWith("/")) errors.push(`${path}.md: image "${src}" must be a path relative to content/`);
      else if (!existsSync(join(contentDir, src))) errors.push(`${path}.md: image "${src}" is not in content/`);
    }
  }

  for (const name of types.keys()) {
    if (!listed.has(name)) errors.push(`standard type ${name} is in no types block`);
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
