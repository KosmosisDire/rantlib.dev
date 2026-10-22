// A file of a RANT project on GitHub: as one of its releases has it, kept under .wrangler once fetched, or as its
// default branch has it now. `checkout` names a variable, such as RANT_SOURCE=../rant, that reads a working tree instead.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cache = join(dirname(fileURLToPath(import.meta.url)), "..", ".wrangler", "releases");

async function fetched(repo, ref, file) {
  const url = `https://raw.githubusercontent.com/${repo}/${ref}/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export async function releaseFile(repo, version, file, checkout) {
  if (process.env[checkout]) return readFileSync(join(process.env[checkout], file), "utf8");
  const kept = join(cache, repo, version, file);
  if (existsSync(kept)) return readFileSync(kept, "utf8");
  const text = await fetched(repo, `v${version}`, file);
  mkdirSync(dirname(kept), { recursive: true });
  writeFileSync(kept, text);
  return text;
}

export async function branchFile(repo, file, checkout) {
  if (process.env[checkout]) return readFileSync(join(process.env[checkout], file), "utf8");
  return fetched(repo, "HEAD", file);
}
