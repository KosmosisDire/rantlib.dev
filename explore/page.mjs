// The web explorer as an explorer release ships it, the page zip its release attaches.
import { unzipSync } from "fflate";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Bump to the newest explorer release before a deploy. EXPLORER_WEB=../explorer-rant/bin/web takes a build instead.
const version = "0.0.24";
const cache = join(dirname(fileURLToPath(import.meta.url)), "..", ".wrangler", "explorer", `rant-explorer-${version}-web.zip`);

async function zip() {
  if (existsSync(cache)) return readFileSync(cache);
  const url = `https://github.com/KosmosisDire/rant-explorer/releases/download/v${version}/rant-explorer-${version}-web.zip`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, bytes);
  return bytes;
}

// Writes the page's files into out.
export async function page(out) {
  if (process.env.EXPLORER_WEB) {
    cpSync(process.env.EXPLORER_WEB, out, { recursive: true });
    return;
  }
  for (const [name, bytes] of Object.entries(unzipSync(await zip()))) {
    if (name.endsWith("/")) continue;
    mkdirSync(dirname(join(out, name)), { recursive: true });
    writeFileSync(join(out, name), bytes);
  }
}
