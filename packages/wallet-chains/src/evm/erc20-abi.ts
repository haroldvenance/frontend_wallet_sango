/**
 * ABI minimale ERC-20 — uniquement les fonctions utilisées par
 * `EvmTokenProvider` (lecture) et `EvmTransactionBuilder` (écriture).
 *
 * Utilisée avec `viem.encodeFunctionData` / `decodeFunctionResult`.
 * Isolée dans son propre fichier pour éviter d'importer viem partout.
 *
 * **E2.2.a.1** — ajout de `allowance` (lecture) et `approve`
 * (écriture, exploitée en E2.2.a.2). Selectors canoniques :
 *   - `balanceOf(address)`             → 0x70a08231
 *   - `allowance(address,address)`     → 0xdd62ed3e
 *   - `transfer(address,uint256)`      → 0xa9059cbb
 *   - `approve(address,uint256)`       → 0x095ea7b3
 */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    // E2.2.a.1 — lecture de l'allowance ERC-20 (selector 0xdd62ed3e).
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // E2.2.a.2 — approve (selector 0x095ea7b3). Déclaré ici pour
    // disposer d'une ABI ERC-20 complète dès E2.2.a.1.
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
