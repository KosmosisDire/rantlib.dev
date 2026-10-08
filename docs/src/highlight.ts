import { createCssVariablesTheme, createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/shellscript.mjs";
import c from "shiki/langs/c.mjs";
import cmake from "shiki/langs/cmake.mjs";
import cpp from "shiki/langs/cpp.mjs";
import csharp from "shiki/langs/csharp.mjs";
import hcl from "shiki/langs/hcl.mjs";
import json from "shiki/langs/json.mjs";
import powershell from "shiki/langs/powershell.mjs";
import python from "shiki/langs/python.mjs";
import toml from "shiki/langs/toml.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";

// Colors come from --shiki-* variables in style.css.
const theme = createCssVariablesTheme({ name: "rant", variablePrefix: "--shiki-" });

const shiki = createHighlighterCoreSync({
  themes: [theme],
  langs: [bash, c, cmake, cpp, csharp, hcl, json, powershell, python, toml, typescript, yaml],
  engine: createJavaScriptRegexEngine(),
});

const aliases: Record<string, string> = {
  sh: "shellscript",
  shell: "shellscript",
  bash: "shellscript",
  ps1: "powershell",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  py: "python",
  ts: "typescript",
  yml: "yaml",
};

export function highlight(code: string, lang: string): string {
  const name = aliases[lang] ?? lang;
  if (!shiki.getLoadedLanguages().includes(name)) return "";
  return shiki.codeToHtml(code, { lang: name, theme: "rant" });
}
