const RAW = "https://raw.githubusercontent.com/KosmosisDire/rant-cli/refs/heads/main/";

function installer(path: string, userAgent: string): string | null {
  if (path === "/install.ps1") return "install.ps1";
  if (path === "/install.sh") return "install.sh";
  if (path !== "/") return null;
  // irm sends a Mozilla/5.0 agent too, so PowerShell is checked before anything else.
  if (/PowerShell/i.test(userAgent)) return "install.ps1";
  if (/^(curl|wget)\//i.test(userAgent)) return "install.sh";
  return null;
}

export default {
  fetch(request: Request): Response {
    const file = installer(new URL(request.url).pathname, request.headers.get("user-agent") ?? "");
    return Response.redirect(file ? RAW + file : "https://rantlib.dev", 302);
  },
};
