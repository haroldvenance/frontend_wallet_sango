/**
 * **Phase 12-A** — Probe `eth_chainId` d'un endpoint EVM.
 *
 * Valide qu'une URL saisie par l'utilisateur pointe bien vers le
 * réseau attendu. **Une URL valide ne garantit pas qu'elle pointe
 * vers la bonne blockchain.**
 *
 * ⚠️ Ne logge jamais l'URL reçue — les messages d'erreur sont
 * volontairement URL-agnostiques. Le caller peut appliquer
 * `redactUrl()` s'il a besoin d'afficher l'URL.
 *
 * Timeout : 5 secondes. Pas de retry (l'utilisateur peut cliquer
 * plusieurs fois).
 */
export interface ProbeEvmResult {
  readonly ok: boolean;
  /** Chain ID retourné par le RPC (décimale), si l'appel a réussi. */
  readonly chainId?: number;
  /** Message d'erreur URL-agnostique, si `ok === false`. */
  readonly message?: string;
}

const PROBE_TIMEOUT_MS = 5_000;

export async function probeEvmEndpoint(
  url: string,
  expectedChainIdHex: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<ProbeEvmResult> {
  const expected = Number.parseInt(expectedChainIdHex, 16);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const e = err as { name?: string; message?: string };
    const msg =
      e.name === "AbortError"
        ? "Timeout (5 s)"
        : (e.message ?? "Erreur réseau");
    return { ok: false, message: `Connexion impossible — ${msg}` };
  }
  clearTimeout(timer);

  if (!response.ok) {
    return {
      ok: false,
      message: `HTTP ${response.status} ${response.statusText}`.trim(),
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: "Réponse non-JSON" };
  }

  const result = (body as { result?: unknown }).result;
  if (typeof result !== "string" || !/^0x[0-9a-fA-F]+$/.test(result)) {
    return { ok: false, message: "Réponse JSON-RPC invalide" };
  }

  const actual = Number.parseInt(result, 16);
  if (actual !== expected) {
    return {
      ok: false,
      chainId: actual,
      message: `Chain ID ${result} (${actual}) ≠ attendu ${expectedChainIdHex} (${expected})`,
    };
  }

  return { ok: true, chainId: actual };
}
