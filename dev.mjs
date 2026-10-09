// Run the dev servers together, each on its port from sites.json. Pass a name to run just one.
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sites from "./sites.json" with { type: "json" };

const wrangler = fileURLToPath(new URL("./node_modules/wrangler/bin/wrangler.js", import.meta.url));
const windows = process.platform === "win32";
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sites);

const servers = names.map((name) => {
  const config = name === "site" ? "wrangler.jsonc" : `${name}/wrangler.jsonc`;
  // Elsewhere each server leads its own process group, so the group can be stopped as one.
  return spawn(process.execPath, [wrangler, "dev", "--config", config, "--port", String(sites[name].port)], {
    stdio: "inherit",
    detached: !windows,
  });
});

// Wrangler runs workerd in child processes, which outlive a kill of wrangler alone. Stop each whole tree.
function kill(server) {
  if (server.exitCode !== null) return;
  if (windows) spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
  else {
    // Throws when the group exited before its exit event arrived.
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
}

// Stop all when one ends or when this process is told to stop.
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  servers.forEach(kill);
  process.exit();
}
for (const s of servers) s.on("exit", stop);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, stop);
