import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import prettier from "prettier";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const penText = await read("docs/ui/plan-checkin.pen");
const pen = JSON.parse(penText);
const tree = JSON.parse(await read("docs/ui/plan-checkin-visual-tree.json"));
const spec = JSON.parse(await read("docs/ui/web-style-map.json"));
const digest = createHash("sha256").update(penText).digest("hex");
if (tree.source.designFileSha256 !== digest)
  throw new Error(
    "Pen visual tree is stale; synchronize it with the current Pen before generating Web styles.",
  );
const nodes = new Map();
function collect(node) {
  if (node.id) nodes.set(node.id, node);
  for (const child of node.children ?? []) collect(child);
}
collect(pen);
const screenKeys = new Set(tree.screens.map((screen) => screen.key));
for (const page of spec.pages)
  for (const source of page.sources)
    if (!screenKeys.has(source))
      throw new Error(`Unknown source screen: ${source}`);
const tokens = {};
for (const [name, source] of Object.entries(spec.tokens)) {
  const value = nodes.get(source.nodeId)?.[source.property];
  if (value === undefined) throw new Error(`Missing Pen token source ${name}`);
  tokens[name] =
    `${name === "font-family" ? JSON.stringify(value) : value}${source.unit ?? ""}`;
}
for (const [name, source] of Object.entries(spec.derivedTokens ?? {})) {
  const value = source.terms.reduce((total, term) => {
    const node = nodes.get(term.nodeId);
    const product = term.properties.reduce(
      (result, property) => result * node?.[property],
      1,
    );
    return total + product * term.factor;
  }, 0);
  if (!Number.isFinite(value))
    throw new Error(`Invalid derived Pen token ${name}`);
  tokens[name] = `${Number(value.toFixed(2))}${source.unit ?? ""}`;
}
tokens["app-width"] = `${spec.layout.maxWidth}px`;
const colors = Object.fromEntries(
  Object.entries(tree.variables.variables)
    .filter(([, item]) => item.type === "color")
    .map(([name, item]) => [name, item.value]),
);
const copy = Object.fromEntries(
  Object.entries(spec.copy).map(([name, id]) => {
    const node = nodes.get(id);
    if (!node || node.type !== "text")
      throw new Error(`Invalid fixed copy ${name}`);
    return [name, node.content];
  }),
);
const css = await prettier.format(
  `/* Generated from current Pen and docs/ui/web-style-map.json. */\n:root {\n${Object.entries(
    { ...colors, ...tokens },
  )
    .map(([name, value]) => `  --ui-${name}: ${value};`)
    .join(
      "\n",
    )}\n}\n@media (prefers-color-scheme: dark) { :root {\n${Object.entries(
    spec.darkColors,
  )
    .map(([name, value]) => `--ui-${name}: ${value};`)
    .join("\n")}\n} }\n`,
  { parser: "css" },
);
const ts = await prettier.format(
  `// Generated from current Pen and docs/ui/web-style-map.json.\nexport const designSourceSha256 = ${JSON.stringify(digest)};\nexport const uiCopy = ${JSON.stringify(copy, null, 2)} as const;\nexport const uiNavigation = ${JSON.stringify(spec.navigation, null, 2)} as const;\nexport const uiPageSources = ${JSON.stringify(spec.pages, null, 2)} as const;\n`,
  { parser: "typescript" },
);
const outputs = {
  "apps/web/src/styles/pen.generated.css": css,
  "apps/web/src/design/pen.generated.ts": ts,
};
for (const [path, content] of Object.entries(outputs)) {
  const target = new URL(path, root);
  if (process.argv.includes("--write")) {
    await mkdir(new URL("./", target), { recursive: true });
    await writeFile(target, content);
  } else if (process.argv.includes("--check")) {
    if ((await read(path)) !== content)
      throw new Error(`Generated Web design drift: ${path}`);
  } else throw new Error("Use --write or --check.");
}
process.stdout.write(
  `Web design: ${Object.keys(tokens).length} source tokens, ${Object.keys(copy).length} fixed labels, ${spec.pages.length} mapped page groups.\n`,
);
