// The standard types, read from the Rant release these docs describe. Each definition is schema text: the comment
// above the type describes it, and the comment after a field or enum option gives its [unit] and then a note.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { slug } from "./slug.mjs";

// Bump to the newest Rant release before a deploy. RANT_SOURCE=../rant reads a checkout instead.
const version = "0.0.33";
const file = "src/serialize/stdtypes.c";
const cache = join(dirname(fileURLToPath(import.meta.url)), "..", ".wrangler", "rant", `stdtypes-${version}.c`);

async function source() {
  if (process.env.RANT_SOURCE) return readFileSync(join(process.env.RANT_SOURCE, file), "utf8");
  if (existsSync(cache)) return readFileSync(cache, "utf8");
  const url = `https://raw.githubusercontent.com/KosmosisDire/Rant/v${version}/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, text);
  return text;
}

const unitAndNote = (comment) => {
  const [, unit = "", note = comment] = comment.match(/^\[([^\]]*)\]\s*(.*)$/) ?? [];
  return { unit, note };
};

// { name, id, summary, details } plus fields for a struct, or alias for a type such as i64. A field, an enum
// option and an alias have a type or a value, and a unit and a note when commented. An enum field has options.
function parse(name, text) {
  const fail = (why) => {
    throw new Error(`standard type ${name}: ${why}`);
  };
  const tokens = [];
  const comments = [];
  text.split("\n").forEach((line, row) => {
    for (const [, comment, word] of line.matchAll(/--\s*(.*\S)?|(\w+|\S)/g)) {
      if (word) tokens.push({ text: word, row });
      else comments.push({ text: comment ?? "", row });
    }
  });

  let i = 0;
  const peek = () => tokens[i]?.text;
  const take = (want) => {
    if (i >= tokens.length || (want !== undefined && peek() !== want)) fail(`expected ${want ?? "more"} after ${tokens[i - 1]?.text}`);
    return tokens[i++].text;
  };
  // A comment belongs to the last field, option or alias that starts on its row.
  const items = [];
  const item = (props) => {
    const it = { ...props, row: tokens[i].row };
    items.push(it);
    return it;
  };

  // A type as written, such as string<30>, Double3[] or enum<u8> with its options.
  const type = () => {
    let text = take();
    if (peek() === "<") text += take() + take() + take(">");
    let options;
    if (text.startsWith("enum")) {
      options = [];
      take("{");
      while (peek() !== "}") {
        const option = item({ name: take() });
        option.value = peek() === "=" ? (take(), Number(take())) : (options.at(-1)?.value ?? -1) + 1;
        if (peek() === ",") take();
        options.push(option);
      }
      take("}");
    }
    while (peek() === "[") text += take() + (peek() === "]" ? "" : take()) + take("]");
    return options ? { type: text, options } : { type: text };
  };

  const first = tokens[0]?.row ?? fail("has no type");
  const [summary = fail("has no description above it"), ...details] = comments.filter((c) => c.row < first).map((c) => c.text);
  const result = { name, id: slug(name), summary, details: details.join(" ") };
  if (peek() === "{") {
    take();
    result.fields = [];
    while (peek() !== "}") {
      const field = item({ name: take() });
      take(":");
      Object.assign(field, type());
      if (peek() === ",") take();
      result.fields.push(field);
    }
    take("}");
  } else Object.assign((result.alias = item({})), type());
  if (i < tokens.length) fail(`expected the end after ${tokens[i - 1].text}`);

  for (const c of comments.filter((c) => c.row >= first)) {
    const owner = items.findLast((it) => it.row === c.row) ?? fail(`the comment "${c.text}" follows no field`);
    Object.assign(owner, unitAndNote(c.text));
  }
  for (const it of items) delete it.row;
  return result;
}

// A types block on a docs page lists the names of the standard types it shows.
export const typeNames = (block) => block.split(/\s+/).filter(Boolean);

// Every standard type by name, in the order of the library's table.
export async function loadTypes() {
  const text = await source();
  const table = text.slice(text.indexOf("i_rant_std_table[] = {"), text.indexOf("};", text.indexOf("i_rant_std_table[] = {")));
  const types = new Map();
  // An entry is { "Name", "text" "text" }, the C string literals joined.
  for (const [, name, literals] of table.matchAll(/\{\s*"(\w+)",((?:\s*"(?:[^"\\]|\\.)*")+)\s*\}/g)) {
    const definition = [...literals.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(([, s]) => s.replace(/\\(.)/g, (_, c) => (c === "n" ? "\n" : c))).join("");
    types.set(name, parse(name, definition));
  }
  if (!types.size) throw new Error(`no standard types found in ${file}`);
  return types;
}

// The type as a schema statement, for the plain text copies of the docs.
export function statement(type) {
  const note = (it) => [it.unit && `[${it.unit}]`, it.note].filter(Boolean).join(" ");
  const comment = (code, it) => (note(it) ? `${code}  -- ${note(it)}` : code);
  const lines = [`-- ${type.summary}`, ...(type.details ? [`-- ${type.details}`] : [])];
  if (type.alias) return [...lines, comment(`${type.name} = ${type.alias.type}`, type.alias)].join("\n");
  if (!type.fields.some((f) => note(f) || f.options)) {
    const fields = type.fields.map((f) => `${f.name}: ${f.type}`).join(", ");
    return [...lines, `${type.name} { ${fields}${fields ? " " : ""}}`].join("\n");
  }
  const rows = type.fields.flatMap((f) => [
    [`  ${f.name}: ${f.type}${f.options ? " {" : ""}`, f],
    ...(f.options ?? []).map((o) => [`    ${o.name} = ${o.value}`, o]),
    ...(f.options ? [["  }", {}]] : []),
  ]);
  const width = Math.max(...rows.map(([code]) => code.length));
  return [...lines, `${type.name} {`, ...rows.map(([code, it]) => (note(it) ? comment(code.padEnd(width), it) : code)), "}"].join("\n");
}
