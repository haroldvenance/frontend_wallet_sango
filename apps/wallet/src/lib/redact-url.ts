/**
 * **Phase 12-A** — Neutralise les identifiants d'une URL avant tout
 * log ou toast.
 *
 * **Cible** :
 *   - Query params dont la clé matche `/(api[-_]?key|apikey|key|token|
 *     secret|auth|access[-_]?token)/i`.
 *   - Authority `user:pass@host`.
 *
 * **Ne touche PAS** aux segments de path (un hash hexadécimal d'URL
 * path n'est pas forcément une clé). Faux positifs écartés.
 *
 * **URL non-parseable** → `"[invalid-url]"`. La string brute n'est
 * jamais exposée.
 */
const SENSITIVE_QUERY_KEY =
  /^(api[-_]?key|apikey|key|token|secret|auth|access[-_]?token)$/i;

export function redactUrl(input: string): string {
  if (typeof input !== "string" || input.length === 0) {
    return "[invalid-url]";
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "[invalid-url]";
  }

  // 1. user:pass@host → user:***@host / ***:***@host
  if (url.username || url.password) {
    url.username = url.username ? "***" : "";
    url.password = url.password ? "***" : "";
  }

  // 2. Query params sensibles.
  for (const key of Array.from(url.searchParams.keys())) {
    if (SENSITIVE_QUERY_KEY.test(key)) {
      url.searchParams.set(key, "***");
    }
  }

  return url.toString();
}
