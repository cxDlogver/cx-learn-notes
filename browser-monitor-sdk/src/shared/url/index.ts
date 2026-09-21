const DEFAULT_SENSITIVE_QUERY_KEYS = [
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'password',
  'secret',
  'api_key',
  'apikey',
];

export function sanitizeUrl(
  input: string,
  sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_QUERY_KEYS,
): string {
  try {
    const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
    const url = new URL(input, base);
    // Protocol 2.0 never transmits query strings. This removes both secrets and
    // unbounded-cardinality identifiers before they enter any SDK queue.
    void sensitiveKeys;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    // Even malformed or non-standard URLs must not bypass the privacy rule.
    return input.split(/[?#]/, 1)[0] ?? '';
  }
}

export function currentUrl(): string {
  return typeof location === 'undefined' ? 'about:blank' : location.href;
}
