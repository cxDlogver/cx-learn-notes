import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import prettier from "prettier";

const root = new URL("../", import.meta.url);
const spec = JSON.parse(
  await readFile(new URL("packages/contracts/openapi.json", root), "utf8"),
);
const baselineUrl = new URL("packages/contracts/compat-baseline.json", root);
const snapshot = {
  version: spec.info.version,
  operations: Object.fromEntries(
    Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, operation]) => [
        operation.operationId,
        {
          path,
          method,
          parameters: (operation.parameters ?? [])
            .filter((parameter) => parameter.required)
            .map((parameter) => `${parameter.in}:${parameter.name}`),
          responses: Object.keys(operation.responses),
        },
      ]),
    ),
  ),
  schemas: Object.fromEntries(
    Object.entries(spec.components.schemas).map(([name, schema]) => [
      name,
      {
        required: schema.required ?? [],
        properties: Object.fromEntries(
          Object.entries(schema.properties ?? {}).map(([key, value]) => [
            key,
            value.enum ?? (value.const === undefined ? null : [value.const]),
          ]),
        ),
      },
    ]),
  ),
};

if (process.argv.includes("--write-baseline")) {
  await writeFile(
    baselineUrl,
    await prettier.format(JSON.stringify(snapshot), { parser: "json" }),
    "utf8",
  );
  process.stdout.write("Wrote API compatibility baseline.\n");
} else {
  const baseline = JSON.parse(await readFile(baselineUrl, "utf8"));
  const breaking = [];
  for (const [id, old] of Object.entries(baseline.operations)) {
    const current = snapshot.operations[id];
    if (
      !current ||
      current.path !== old.path ||
      current.method !== old.method
    ) {
      breaking.push(`Removed or moved operation ${id}`);
      continue;
    }
    for (const parameter of current.parameters) {
      if (!old.parameters.includes(parameter)) {
        breaking.push(`New required parameter ${id}: ${parameter}`);
      }
    }
    for (const response of old.responses) {
      if (!current.responses.includes(response)) {
        breaking.push(`Removed response ${id}: ${response}`);
      }
    }
  }
  for (const [name, old] of Object.entries(baseline.schemas)) {
    const current = snapshot.schemas[name];
    if (!current) {
      breaking.push(`Removed schema ${name}`);
      continue;
    }
    for (const key of current.required) {
      if (!old.required.includes(key))
        breaking.push(`New required field ${name}.${key}`);
    }
    for (const [key, oldEnum] of Object.entries(old.properties)) {
      if (!(key in current.properties)) {
        breaking.push(`Removed field ${name}.${key}`);
      } else if (oldEnum) {
        const newEnum = current.properties[key];
        if (newEnum && oldEnum.some((value) => !newEnum.includes(value))) {
          breaking.push(`Narrowed enum ${name}.${key}`);
        }
      }
    }
  }
  if (breaking.length)
    throw new Error(`Breaking API change:\n${breaking.join("\n")}`);
  process.stdout.write("API compatibility baseline check passed.\n");
}
