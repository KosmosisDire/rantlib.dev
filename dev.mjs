// Run the dev servers together, each on its port from sites.json. Pass a name to run just one.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const sites = JSON.parse(readFileSync(new URL("./sites.json", import.meta.url), "utf8"));
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sites);

const servers = names.map((name) => {
  const config = name === "site" ? "wrangler.jsonc" : `${name}/wrangler.jsonc`;
  return spawn("npx", ["wrangler", "dev", "--config", config, "--port", String(sites[name].port)], {
    stdio: "inherit",
    shell: true,
  });
});

// Stop all when one ends or when this process is interrupted.
const stop = () => servers.forEach((s) => s.kill());
for (const s of servers) s.on("exit", stop);
process.on("SIGINT", stop);
