import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { URL } from "node:url";
import process from "node:process";

const root = new URL("../", import.meta.url);
const base = "docs/atdd/web/evidence/WEB-19/";
const run = `${base}public-style-20261003-final/`;
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse(await read(path));
const digest = async (path) =>
  createHash("sha256")
    .update(await read(path))
    .digest("hex");
const capture = await json(`${run}capture.json`);
const observations = [];
for (const label of [
  "login-light-320",
  "login-light-393",
  "login-light-480",
  "login-light-1440",
  "login-dark-1440",
  "login-dark-320",
]) {
  const layoutPath = `${run}layout-${label}.json`;
  const screenPath = `${run}screen-${label}.png`;
  const layout = await json(layoutPath);
  const expectedWidth = Math.min(layout.viewport.width, 480);
  assert.equal(layout.horizontalOverflow, false, label);
  assert.equal(layout.controlsOutsideViewportWidth, 0, label);
  assert.equal(layout.fontLoaded, true, label);
  assert.equal(layout.container.width, expectedWidth, label);
  assert.equal(
    layout.container.left,
    (layout.viewport.width - expectedWidth) / 2,
    label,
  );
  assert.equal(layout.container.top, 0, label);
  assert.ok((await read(screenPath)).length > 1000, label);
  observations.push({
    label,
    status: "OBSERVED",
    layout,
    screenshot: { path: screenPath, sha256: await digest(screenPath) },
    metrics: { path: layoutPath, sha256: await digest(layoutPath) },
  });
}
const checks = [];
for (const name of [
  "eslint",
  "typecheck",
  "design",
  "format",
  "build",
  "static",
]) {
  const path = `${base}${name}-20261003.txt`;
  assert.match((await read(path)).toString(), /exitCode=0/, name);
  checks.push({
    name,
    exitCode: 0,
    outputPath: path,
    sha256: await digest(path),
  });
}
const sourcePaths = [
  "docs/ui/plan-checkin.pen",
  "docs/ui/plan-checkin-visual-tree.json",
  "docs/ui/web-style-map.json",
  "apps/web/src/design/pen.generated.ts",
  "apps/web/src/styles/pen.generated.css",
  "apps/web/src/styles/layout.css",
  "apps/web/src/styles/components.css",
  "apps/web/src/styles/pages.css",
  "apps/web/src/assets/fonts/NotoSansSC.woff2",
  "apps/web/src/assets/fonts/OFL.txt",
  "apps/web/src/app/App.tsx",
  "apps/web/src/app/Plans.tsx",
  "apps/web/src/app/TodayCheckin.tsx",
  "apps/web/src/app/PlanReminders.tsx",
  "apps/web/src/app/ShareManager.tsx",
  "apps/web/src/app/MobileUI.tsx",
];
const sourceFiles = await Promise.all(
  sourcePaths.map(async (path) => ({ path, sha256: await digest(path) })),
);
const receipt = {
  schemaVersion: "1.0",
  scope:
    "WEB-19 implementation increment; public login layout observations only",
  capturedAt: capture.capturedAt,
  browser: capture.browser,
  sources: sourceFiles,
  checks,
  observations,
  acceptanceIdsReferenced: [
    "WEB-UI-01",
    "WEB-UI-02",
    "WEB-UI-04",
    "WEB-UI-05",
    "WEB-UI-11",
  ],
  formalAcceptanceStatus: "NOT_RUN",
  limitations: [
    "No authenticated browser flow executed",
    "No Safari/Firefox/Edge/mobile device, screen reader or 200% acceptance",
    "Automatic approval rejected broadening loopback-only SMS fixture authentication; original safeguard restored",
    "Pen secondary text contrast requires the formal accessibility/design review; these observations assert layout and font loading only",
  ],
};
await writeFile(
  new URL(`${base}style-alignment-20261003.json`, root),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
process.stdout.write(
  `Style increment: ${checks.length} code/build checks; ${observations.length} anonymous layout observations. Formal acceptance remains NOT_RUN.\n`,
);
