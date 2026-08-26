import { resolveApiBaseUrl } from "@/utils/apiBaseUrl";

describe("API base URL resolution", () => {
  test("uses localhost backend when the frontend is opened through localhost", () => {
    expect(
      resolveApiBaseUrl("", {
        protocol: "http:",
        hostname: "localhost",
      }),
    ).toBe("http://localhost:18080");
  });

  test("uses 127.0.0.1 backend when the frontend is opened through 127.0.0.1", () => {
    expect(
      resolveApiBaseUrl("", {
        protocol: "http:",
        hostname: "127.0.0.1",
      }),
    ).toBe("http://127.0.0.1:18080");
  });

  test("keeps an explicitly configured API base URL unchanged", () => {
    expect(
      resolveApiBaseUrl("https://api.example.test", {
        protocol: "http:",
        hostname: "localhost",
      }),
    ).toBe("https://api.example.test");
  });

  test("aligns a configured local loopback API host with the browser hostname", () => {
    expect(
      resolveApiBaseUrl("http://127.0.0.1:18080", {
        protocol: "http:",
        hostname: "localhost",
      }),
    ).toBe("http://localhost:18080");
  });
});
