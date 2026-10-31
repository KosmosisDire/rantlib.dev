// The standard types, read from the Rant release these docs describe: types/stdtypes.json, which rant_codegen writes
// from the schema file. The comment above a type describes it, and the one after a member gives its unit and note.
import { releaseFile } from "./source.mjs";
import { slug } from "./slug.mjs";

// Bump to the newest Rant release before a deploy. RANT_SOURCE=../rant reads a checkout instead.
const version = "0.0.41";
const file = "types/stdtypes.json";

// { name, id, summary, details } plus fields for a struct, or alias for a type such as i64 or an enum, whose alias
// has options. A field, an option and an alias have a type or a value, and a unit and a note.
function shape({ name, kind, backing, about, members }) {
  const [summary, ...details] = about;
  if (!summary) throw new Error(`standard type ${name} has no description above it`);
  const type = { name, id: slug(name), summary, details: details.join(" ") };
  if (kind === "struct") return { ...type, fields: members };
  if (kind === "enum") return { ...type, alias: { type: `enum<${backing}>`, options: members } };
  return { ...type, alias: members[0] };
}

// A types block on a docs page lists the names of the standard types it shows.
export const typeNames = (block) => block.split(/\s+/).filter(Boolean);

// Every standard type by name, in the order of the schema file.
export async function loadTypes() {
  const { types } = JSON.parse(await releaseFile("KosmosisDire/Rant", version, file, "RANT_SOURCE"));
  return new Map(types.map((t) => [t.name, shape(t)]));
}

// The type as a schema statement, for the plain text copies of the docs.
export function statement(type) {
  const note = (it) => [it.unit && `[${it.unit}]`, it.note].filter(Boolean).join(" ");
  const comment = (code, it) => (note(it) ? `${code}  -- ${note(it)}` : code);
  const lines = [`-- ${type.summary}`, ...(type.details ? [`-- ${type.details}`] : [])];
  const block = (head, rows) => {
    const width = Math.max(...rows.map(([code]) => code.length));
    return [...lines, head, ...rows.map(([code, it]) => (note(it) ? comment(code.padEnd(width), it) : code)), "}"].join("\n");
  };
  if (type.alias?.options) return block(`${type.name} = ${type.alias.type} {`, type.alias.options.map((o) => [`  ${o.name} = ${o.value}`, o]));
  if (type.alias) return [...lines, comment(`${type.name} = ${type.alias.type}`, type.alias)].join("\n");
  if (!type.fields.some((f) => note(f))) {
    const fields = type.fields.map((f) => `${f.name}: ${f.type}`).join(", ");
    return [...lines, `${type.name} { ${fields}${fields ? " " : ""}}`].join("\n");
  }
  return block(`${type.name} {`, type.fields.map((f) => [`  ${f.name}: ${f.type}`, f]));
}
