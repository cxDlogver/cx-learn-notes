import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import "../apps/api/node_modules/reflect-metadata/Reflect.js";
import { ExportsController } from "../apps/api/dist/exports/exports.controller.js";

const spec = JSON.parse(
  await readFile(
    new URL("../packages/contracts/openapi.json", import.meta.url),
  ),
);
const controllerPaths = Reflect.getMetadata("path", ExportsController);
assert.deepEqual(controllerPaths, ["exports", "me/exports"]);

const methods = [
  ["create", "post", ""],
  ["list", "get", ""],
  ["get", "get", ":id"],
  ["download", "get", ":id/download-url"],
];
const operationIds = new Set();
for (const [methodName, method, suffix] of methods) {
  assert.equal(
    Reflect.getMetadata("path", ExportsController.prototype[methodName]),
    suffix || "/",
  );
  for (const path of controllerPaths) {
    const route = `/api/v1/${path}${suffix ? `/${suffix.replace(/:([^/]+)/g, "{$1}")}` : ""}`;
    assert.ok(
      spec.paths[route]?.[method],
      `OpenAPI missing ${method.toUpperCase()} ${route}`,
    );
    const operationId = spec.paths[route][method].operationId;
    assert.ok(
      !operationIds.has(operationId),
      `duplicate operationId ${operationId}`,
    );
    operationIds.add(operationId);
  }
}
assert.equal(operationIds.size, 8);
process.stdout.write(
  "WEB-01 export route audit passed: 2 paths x 4 methods, unique OpenAPI operation IDs.\n",
);
