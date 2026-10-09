// Bundle the TypeScript and CSS of a target into its output folder, beside its static files.
import { build } from "esbuild";
import { generate } from "./docs/generate.mjs";
import { validate } from "./docs/validate.mjs";
import sites from "./sites.json" with { type: "json" };
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Both sites load the theme toggle.
const theme = { theme: "src/theme.ts" };

const targets = {
  site: {
    out: "dist",
    copy: [["public", "."]],
    entries: { ...theme, main: "src/main.ts", style: "src/style.css" },
  },
  docs: {
    out: "dist-docs",
    copy: [["public/logo.svg", "logo.svg"], ["docs/content", "content"]],
    entries: { ...theme, main: "docs/src/main.ts", style: "docs/src/style.css" },
  },
};

// Bring out/ to match staging/ and touch only the files that differ. A running wrangler dev watches out/,
// and on Windows removing a watched file makes it drop the watcher and serve a stale file list.
function sync(staging, out) {
  const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1));
  const wanted = new Set(files(staging));
  for (const file of wanted) {
    const from = readFileSync(join(staging, file));
    let same = false;
    try {
      same = from.equals(readFileSync(join(out, file)));
    } catch {}
    if (same) continue;
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), from);
  }
  for (const file of files(out)) if (!wanted.has(file)) rmSync(join(out, file));
}

const names = process.argv[2] ? [process.argv[2]] : Object.keys(targets);

for (const name of names) {
  const target = targets[name];
  if (!target) throw new Error(`Unknown target ${name}`);
  if (name === "docs") {
    const problems = validate(join(here, "docs", "content"));
    if (problems.length) {
      console.error(problems.map((p) => `docs: ${p}`).join("\n"));
      process.exit(1);
    }
  }
  const out = join(here, target.out);
  const staging = join(here, ".wrangler", "build", name);

  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  for (const [from, to] of target.copy) cpSync(join(here, from), join(staging, to), { recursive: true });

  if (name === "docs") await generate(join(here, "docs", "content"), join(here, "docs", "page.html"), staging, `https://${sites.docs.host}`);

  await build({
    absWorkingDir: here,
    entryPoints: target.entries,
    outdir: staging,
    bundle: true,
    format: "esm",
    target: "es2022",
    sourcemap: true,
    minify: true,
    logLevel: "warning",
  });

  mkdirSync(out, { recursive: true });
  sync(staging, out);
}
