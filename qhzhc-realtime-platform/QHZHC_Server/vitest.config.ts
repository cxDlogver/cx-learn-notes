import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/auth-tokens.test.ts",
      "tests/protocol.test.ts",
      "tests/server-services.test.ts",
      "tests/frontend-realtime.test.ts",
      "tests/weather.test.ts"
    ]
  }
});
