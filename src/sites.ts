import sites from "../sites.json";

const ports = new Map(Object.values(sites).map((s) => [s.host, s.port]));

// Links in the HTML use the live addresses. Anywhere else (the dev servers) they point at the local ports.
export function localizeLinks(root: ParentNode = document) {
  if (ports.has(location.hostname)) return;
  for (const link of root.querySelectorAll<HTMLAnchorElement>("a[href^='http']")) {
    const url = new URL(link.href);
    const port = ports.get(url.hostname);
    if (port) link.href = `${location.protocol}//${location.hostname}:${port}${url.pathname}${url.search}${url.hash}`;
  }
}
