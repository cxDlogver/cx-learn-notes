import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import process from "node:process";
import { URL } from "node:url";
import prettier from "prettier";

const root = new URL("../", import.meta.url);
const resolve = (path) => new URL(path, root);
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(path), "utf8"));
const source = await readJson("docs/ui/plan-checkin-visual-tree.json");
const designFile = await readFile(resolve("docs/ui/plan-checkin.pen"));
if (
  createHash("sha256").update(designFile).digest("hex") !==
  source.source.designFileSha256
) {
  throw new Error("Pen source digest differs from its structured visual tree.");
}
const pageMap = await readJson("docs/ui/plan-checkin-page-map.json");
const mapScreens = pageMap.groups.flatMap((group) =>
  group.screens.map((screen) => ({ ...screen, groupId: group.id })),
);
const treeScreens = new Map(
  source.screens.map((screen) => [screen.key, screen]),
);
if (mapScreens.length !== 32 || treeScreens.size !== 32) {
  throw new Error(
    "Pen page map and visual tree must both contain 32 unique screens.",
  );
}

const penColors = Object.fromEntries(
  Object.entries(source.variables.variables)
    .filter(([, token]) => token.type === "color")
    .map(([name, token]) => [name, token.value]),
);
const screens = mapScreens.map((screen) => {
  const tree = treeScreens.get(screen.key);
  if (!tree || tree.order !== screen.order || tree.groupId !== screen.groupId) {
    throw new Error(`Pen screen mismatch: ${screen.key}`);
  }
  const referenceImage = `uxpilot-export-09-27-26_${String(screen.imageNo).padStart(2, "0")}.png`;
  if (
    tree.referenceImage !== referenceImage ||
    tree.viewport.width !== 393 ||
    tree.viewport.height !== 852
  ) {
    throw new Error(`Pen reference or viewport mismatch: ${screen.key}`);
  }
  return {
    key: screen.key,
    groupId: screen.groupId,
    order: screen.order,
    title: screen.title,
    frameId: tree.frameId,
    referenceImage,
    viewport: tree.viewport,
    keyNodeIds: tree.tree.children.map((node) => node.id).filter(Boolean),
  };
});
const generated = await prettier.format(
  "// Generated from docs/ui/plan-checkin-visual-tree.json and page map. Do not edit by hand.\n" +
    `export const penColors = ${JSON.stringify(penColors, null, 2)} as const;\n\n` +
    `export const penScreens = ${JSON.stringify(screens, null, 2)} as const;\n`,
  { parser: "typescript" },
);
const generatedPath = resolve("packages/design-tokens/src/pen.generated.ts");
const mappingPath = resolve("docs/ui/component-map.json");

if (process.argv.includes("--write")) {
  await writeFile(generatedPath, generated, "utf8");
  try {
    await readFile(mappingPath);
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
    const mapping = {
      schemaVersion: "1.0",
      source: "plan-checkin-visual-tree.json",
      screens: screens.map(({ key, frameId, referenceImage, keyNodeIds }) => ({
        key,
        frameId,
        referenceImage,
        componentPath: null,
        implementationStatus: "planned",
        keyNodes: keyNodeIds.map((nodeId) => ({
          nodeId,
          component: null,
          testID: null,
        })),
      })),
    };
    await writeFile(
      mappingPath,
      JSON.stringify(mapping, null, 2) + "\n",
      "utf8",
    );
  }
  process.stdout.write(
    "Generated Pen colors, 32 screen specs, and initial component map.\n",
  );
} else if (process.argv.includes("--check")) {
  if ((await readFile(generatedPath, "utf8")) !== generated) {
    throw new Error(
      "Generated design tokens drifted from Pen source. Run design:build.",
    );
  }
  const mapping = await readJson("docs/ui/component-map.json");
  const mapped = new Map(mapping.screens.map((screen) => [screen.key, screen]));
  if (mapping.screens.length !== 32 || mapped.size !== 32) {
    throw new Error(
      "Component map must list each of the 32 screens exactly once.",
    );
  }
  for (const screen of screens) {
    const item = mapped.get(screen.key);
    if (
      !item ||
      item.frameId !== screen.frameId ||
      item.referenceImage !== screen.referenceImage ||
      item.keyNodes.some((node) => !screen.keyNodeIds.includes(node.nodeId))
    ) {
      throw new Error(`Invalid component mapping for ${screen.key}`);
    }
  }
  process.stdout.write(
    "Pen design resources and 32-page component map are consistent.\n",
  );
} else {
  throw new Error("Use --write or --check.");
}
await import("./build-web-design.mjs");
