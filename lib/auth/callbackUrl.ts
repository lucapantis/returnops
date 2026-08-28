// Post-login redirect target sanitisation. The login flow reflects a
// `callbackUrl` query parameter straight from the request, so it must be
// constrained to a same-origin *path* before it is handed to `signIn()` —
// otherwise it is an open-redirect primitive.
//
// Kept free of server-only imports so it can be unit tested in isolation.

const MAX_LENGTH = 2048;

/**
 * Returns `raw` only if it is a safe, same-origin, path-absolute URL; otherwise
 * falls back to `"/"`. Rejects:
 *  - non-strings, empty values and absurdly long values
 *  - absolute URLs with a scheme (`https://…`, `javascript:…`)
 *  - protocol-relative URLs (`//evil.com`)
 *  - backslash tricks (`/\evil.com`, `/\/evil.com`) — browsers fold `\` to `/`
 *    in the `Location` header, turning these into protocol-relative redirects
 *  - `/%2F…` and `/%5C…` which decode to the two cases above
 *  - anything containing control characters, spaces or a backslash that a
 *    browser might strip before resolving the URL
 */
export function safeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_LENGTH) {
    return "/";
  }

  // Must be path-absolute…
  if (!raw.startsWith("/")) return "/";
  // …but not protocol-relative or a smuggled host.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";

  const lower = raw.toLowerCase();
  if (lower.startsWith("/%2f") || lower.startsWith("/%5c")) return "/";

  // Reject control characters (<= 0x20, includes tab/CR/LF/space), DEL, and any
  // backslash — all of which a browser may strip or re-interpret.
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f || code === 0x5c) return "/";
  }

  return raw;
}
