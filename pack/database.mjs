// The packages rant install knows, read at build time from the package database and each package's latest release,
// as the CLI reads them: the database at HEAD, each repo's package.rant at HEAD for its name and description, then the
// files the release carries, found by their names.
import hcl from "hcl2-json-parser";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// PACKAGES_SOURCE=../packages-rant reads a checkout of the database. GITHUB_TOKEN lifts GitHub's limit of 60 API calls an hour.
const database = "KosmosisDire/rant-packages";

const raw = (repo, ref, file) => `https://raw.githubusercontent.com/${repo}/${ref}/${file}`;

// The response, or undefined when there is nothing at url.
async function get(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

async function parse(file, text) {
  try {
    return await hcl.parseToObject(text);
  } catch (e) {
    throw new Error(`${file}: ${e}`);
  }
}

async function api(path) {
  const token = process.env.GITHUB_TOKEN;
  const headers = { accept: "application/vnd.github+json", ...(token && { authorization: `Bearer ${token}` }) };
  return (await get(`https://api.github.com/repos/${path}`, headers))?.json();
}

// The README GitHub shows on the default branch, whatever its name and folder, as { path, text }. Main, not the release,
// so a README change shows at the next deploy without a release.
async function readme(repo) {
  const file = await api(`${repo}/readme`);
  return file && { path: file.path, text: Buffer.from(file.content, file.encoding).toString("utf8") };
}

const systems = { win: "Windows", linux: "Linux", osx: "macOS" };
const languageNames = { cmake: "C and C++ through CMake", python: "Python", csharp: "C#", rust: "Rust" };
const platformName = (platform) => {
  const [system, arch] = platform.split("-");
  return systems[system] && arch ? `${systems[system]} ${arch}` : platform;
};

// { name, repo, tag, description, version, date, release, platforms, vsix, skill, nodes, languages, readme }. A problem
// says why rant install or rant add could not take it, and then some of the rest may be missing.
async function about(repo) {
  const head = await get(raw(repo, "HEAD", "package.rant")).then((r) => r?.text());
  if (head === undefined) throw new Error(`packages.rant: ${repo} has no package.rant on its default branch`);
  // The name and description are main's, as rant ls packages --available shows them, so a new one needs no release
  const current = await parse(`${repo} package.rant`, head);
  const name = current.name;
  if (typeof name !== "string" || !/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`packages.rant: ${repo} gives no package name in its package.rant`);
  const [release, about] = await Promise.all([api(`${repo}/releases/latest`), readme(repo)]);
  const out = { name, repo, readme: about, description: current.description ?? "" };
  if (!release) return { ...out, problem: "It has no release yet." };
  const tag = release.tag_name;
  const version = tag.replace(/^v/, "");
  Object.assign(out, { tag, version, date: release.published_at.slice(0, 10), release: release.html_url });
  const assets = release.assets.map((a) => a.name);
  const prefix = `${name}-${version}`;
  out.skill = assets.includes(`${prefix}-skill.zip`);
  // A library is added by the names its package.rant gives on main, as rant add reads them
  const library = current.library?.[0];
  if (library) {
    out.languages = Object.entries(languageNames).filter(([key]) => library[key]).map(([, shown]) => shown);
    return out;
  }
  const text = await get(raw(repo, tag, "package.rant")).then((r) => r?.text());
  if (text === undefined) return { ...out, problem: `Its release ${tag} has no package.rant.` };
  const file = await parse(`${repo} package.rant at ${tag}`, text);
  if (file.name !== name) return { ...out, problem: `Its release ${tag} names the package ${file.name ?? "nothing"}, not ${name}.` };
  out.nodes = Object.keys(file.node ?? {});
  // <name>-<version>-<platform>.tar.gz, <name>-<version>.vsix and <name>-<version>-skill.zip
  out.platforms = assets
    .filter((a) => a.startsWith(`${prefix}-`) && a.endsWith(".tar.gz"))
    .map((a) => platformName(a.slice(prefix.length + 1, -".tar.gz".length)))
    .sort((a, b) => a.localeCompare(b));
  out.vsix = assets.includes(`${prefix}.vsix`);
  if (!out.platforms.length && !out.vsix && !out.skill)
    out.problem = `Its release ${tag} carries no ${prefix}-<platform>.tar.gz, ${prefix}.vsix or ${prefix}-skill.zip.`;
  return out;
}

// Every package, by name.
export async function loadPackages() {
  const source = process.env.PACKAGES_SOURCE;
  const text = source ? readFileSync(join(source, "packages.rant"), "utf8") : await (await get(raw(database, "HEAD", "packages.rant")))?.text();
  if (text === undefined) throw new Error(`${database} has no packages.rant`);
  const { repos } = await parse("packages.rant", text);
  if (!Array.isArray(repos) || !repos.every((r) => typeof r === "string" && /^[\w.-]+\/[\w.-]+$/.test(r)))
    throw new Error("packages.rant: `repos` must list GitHub repos as owner/name");
  const packages = await Promise.all(repos.map(about));
  const named = new Map();
  for (const p of packages) {
    if (named.has(p.name)) throw new Error(`packages.rant: ${p.repo} names the package ${p.name}, as ${named.get(p.name)} does`);
    named.set(p.name, p.repo);
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}
