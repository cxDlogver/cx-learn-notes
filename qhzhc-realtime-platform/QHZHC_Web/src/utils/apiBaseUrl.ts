const DEFAULT_BACKEND_PORT = "18080";
const DEFAULT_BACKEND_HOST = "127.0.0.1";

function localHostname(hostname: string | undefined): string {
  return hostname === "localhost" || hostname === "127.0.0.1"
    ? hostname
    : DEFAULT_BACKEND_HOST;
}

export function resolveApiBaseUrl(
  configuredBaseUrl = process.env.VUE_APP_API_BASE_URL,
  runtimeLocation: Location | null = typeof window === "undefined"
    ? null
    : window.location,
): string {
  const configured = String(configuredBaseUrl || "").trim();
  if (configured) {
    if (!runtimeLocation) return configured.replace(/\/$/, "");
    try {
      const url = new URL(configured);
      if (
        ["localhost", "127.0.0.1"].includes(url.hostname) &&
        ["localhost", "127.0.0.1"].includes(runtimeLocation.hostname)
      ) {
        url.hostname = runtimeLocation.hostname;
      }
      return url.toString().replace(/\/$/, "");
    } catch (_error) {
      return configured.replace(/\/$/, "");
    }
  }
  const hostname = localHostname(runtimeLocation?.hostname);
  return `http://${hostname}:${DEFAULT_BACKEND_PORT}`;
}
