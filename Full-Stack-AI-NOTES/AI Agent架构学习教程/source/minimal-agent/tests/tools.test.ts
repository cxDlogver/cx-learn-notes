import assert from "node:assert/strict";
import test from "node:test";

import { weatherTool } from "../src/tools.ts";

test("weather tool normalizes common English city aliases", async () => {
  const result = await weatherTool.execute({ city: "Beijing" });

  assert.equal(result.ok, true);
  assert.deepEqual(result.output, {
    city: "北京",
    condition: "晴",
    temperatureC: 25
  });
  assert.ok(result.evidence?.[0]?.tags.includes("weather:北京"));
});
