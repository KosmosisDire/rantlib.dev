// The packages rant install knows, read at build time from the package database and each package's latest release,
// as the CLI reads them: the database at HEAD, then the package.rant at the release's tag.
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

// The README GitHub shows at ref, whatever its name and folder, as { path, text }.
async function readme(repo, ref) {
  const file = await api(`${repo}/readme?ref=${encodeURIComponent(ref)}`);
  return file && { path: file.path, text: Buffer.from(file.content, file.encoding).toString("utf8") };
}

const systems = { win: "Windows", linux: "Linux", osx: "macOS" };
const platformName = (platform) => {
  const [system, arch] = platform.split("-");
  return systems[system] && arch ? `${systems[system]} ${arch}` : platform;
};

// The platforms whose file the release attaches. A name without ${platform} is one file for every platform.
function platforms(pattern, version, assets) {
  const [before, after = ""] = pattern.replaceAll("${version}", version).split("${platform}");
  if (!pattern.includes("${platform}")) return assets.includes(before) ? ["Any platform"] : [];
  return assets
    .filter((a) => a.startsWith(before) && a.endsWith(after) && a.length > before.length + after.length)
    .map((a) => platformName(a.slice(before.length, a.length - after.length)))
    .sort((a, b) => a.localeCompare(b));
}

// { name, repo, tag, description, version, date, release, platforms or vsix, nodes, readme }. A problem says why rant install
// could not install it, and then some of the rest may be missing.
async function about(name, repo) {
  const release = await api(`${repo}/releases/latest`);
  if (!release) return { name, repo, problem: "It has no release yet." };
  const tag = release.tag_name;
  const version = tag.replace(/^v/, "");
  const [text, about] = await Promise.all([get(raw(repo, tag, "package.rant")).then((r) => r?.text()), readme(repo, tag)]);
  if (text === undefined) return { name, repo, tag, readme: about, problem: `Its release ${tag} has no package.rant.` };
  const file = await parse(`${repo} package.rant`, text);
  const assets = release.assets.map((a) => a.name);
  const out = {
    name,
    repo,
    tag,
    readme: about,
    description: file.description ?? "",
    version,
    date: release.published_at.slice(0, 10),
    release: release.html_url,
    nodes: Object.keys(file.node ?? {}),
  };
  if (file.archive) {
    out.platforms = platforms(file.archive, version, assets);
    if (!out.platforms.length) out.problem = `Its release ${tag} has no ${file.archive}.`;
  }
  if (file.vsix) {
    out.vsix = true;
    const vsix = file.vsix.replaceAll("${version}", version);
    if (!assets.includes(vsix)) out.problem = `Its release ${tag} has no ${vsix}.`;
  }
  return out;
}

// Every package, by name.
export async function loadPackages() {
  const source = process.env.PACKAGES_SOURCE;
  const text = source ? readFileSync(join(source, "packages.rant"), "utf8") : await (await get(raw(database, "HEAD", "packages.rant")))?.text();
  if (text === undefined) throw new Error(`${database} has no packages.rant`);
  const listed = (await parse("packages.rant", text)).package ?? {};
  const fail = (name, why) => {
    throw new Error(`packages.rant: package "${name}" ${why}`);
  };
  const packages = Object.entries(listed).map(([name, blocks]) => {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) fail(name, "is not a package name");
    if (blocks.length > 1) fail(name, "is listed twice");
    const repo = blocks[0].repo;
    if (typeof repo !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(repo)) fail(name, "needs `repo`, a GitHub repo");
    return about(name, repo);
  });
  return (await Promise.all(packages)).sort((a, b) => a.name.localeCompare(b.name));
}
