# Phase 3 — Multi-wallet keyring

**Clôture** : Phase 3.5 (commit de clôture).
**Sous-patches** : 3.1 → 3.5.
**Décisions actées** : D-Phase3-1 → D-Phase3-5.

---

## Objectif

Plusieurs portefeuilles dans un même keyring local (IndexedDB), avec
switch instantané côté UI — sans re-prompt password. Complète le mockup
« Portefeuilles » (Wallet 1 / Wallet 2).

## Modèle keyring / session

    keyring (IndexedDB)
        │   N entries chiffrées indépendantes
        │   { id, label, format, networkId, stored, createdAt }
        ▼
    decryptAllWallets(password)
        │   essaie chaque entry, agrège succès + échecs
        ▼
    wallet-store (runtime, jamais persisté)
        ├── wallets: Record<id, UnlockedWalletEntry>
        │       wallet, format, networkId (structurel), label, createdAt
        ├── wallet: AnyWallet | null   ← raccourci vers wallets[activeId]
        ▼
    wallet-store (persisté, localStorage)
        ├── activeId: string | null
        ├── walletAccounts: Record<id, { highestIndex, activeIndex }>
        └── walletNetworks: Record<id, networkId>

**D-Phase3-1** — sémantique « session keyring » : un `unlock(password)`
déverrouille **toutes** les entries qui matchent. `switchWallet(id)` est
un simple changement de référence — aucun déchiffrement, aucun
re-prompt.

## Trois dimensions indépendantes

    activeId                 → quel wallet est actif
    walletAccounts[id]       → state HD (comptes) du wallet
    walletNetworks[id]       → réseau courant du wallet

Ces maps ne fusionnent **jamais** dans une structure unique : chaque
dimension a sa propre sémantique (session vs HD vs réseau).

## Règles métier

| Action | Règle |
|---|---|
| `unlock({ wallets })` | Déverrouille tous. `activeId` persisté restauré s'il pointe vers un wallet déverrouillé ; sinon premier du tri `createdAt`. |
| `switchWallet(id)` | Atomique : `activeId`, `wallet`, `format`, `networkId`, `family`, `network` recalculés ensemble. |
| `lock()` | Détruit `wallets` runtime (`destroy()` par instance). **Préserve** `activeId`, `walletAccounts`, `walletNetworks`. |
| `forgetWallet(id)` | Détruit l'instance, retire l'entrée + préférences. Si actif : prochain = **plus ancien par `createdAt`** (D-Phase3-4·B). Si dernier : `status = "locked"`, `activeId = null`. |
| `setNetworkId(id)` | Persiste dans `walletNetworks[activeId]`. Refuse cross-family (D-E2.1-23) et SANGO legacy. |
| `setAccountIndex` / `addAccount` | Ciblent `activeId`. `highestIndex` ne diminue **jamais** (Phase 2). |

## Écrans & flux

    Welcome ──┬─→ /create         (SANGO / EVM / BTC — pills)
              └─→ /import          (picker générique)
                    ├─→ /import-sango    (seed hex Ed25519)
                    ├─→ /import-evm      (mnemonic BIP-39 + réseau EVM)
                    └─→ /import-bitcoin  (mnemonic BIP-39 + réseau BTC)

    Unlock (password) ─→ decryptAllWallets ─→ session keyring
                                             │
                                             ▼
                                       Dashboard
                                       ├─ WalletSwitcher (card unifiée)
                                       │     └─→ WalletsAndAccountsModal
                                       │           ├─ WalletRow × N
                                       │           │    └─ AccountRow × N
                                       │           │         + Ajouter un compte
                                       │           └─ Footer : Créer / Importer
                                       │           └─ ⋯ : Oublier (≥ 2 wallets)

## Décisions clés

- **D-Phase3-1** : session keyring — un password pour N wallets,
  `switchWallet` sans re-prompt.
- **D-Phase3-2** : `useWallets()` = metadata only (id, label, format,
  family, networkId, isActive, createdAt, position, accountCount). Pas
  de balance, pas de token, pas de RPC.
- **D-Phase3-3** : label UI = `Portefeuille {N}` (position 1-based tri
  `createdAt`). `entry.label` keyring reste interne. Rename → Phase 4.
- **D-Phase3-4** : Forget orchestration UI (`keyring.remove` puis
  `store.forgetWallet`), confirmation par saisie exacte du label UI.
  Prochain wallet actif = plus ancien `createdAt`.
- **D-Phase3-5** : retrait de l'ancienne forme `unlock({ wallet, ... })`
  et des composants legacy `AccountSwitcher` / `AccountPickerModal`.
  Forme canonique : `unlock({ wallets: [...] })`.

## Gotchas

1. **`wallets` runtime jamais persisté** — secrets en mémoire seulement,
   détruits par `lock()`.
2. **Password jamais conservé** — `decryptAllWallets` ne garde pas le
   password, seulement les instances `Wallet`/`Bip39Wallet`.
3. **`activeId` conservé malgré `lock()`** — permet de restaurer le
   dernier wallet après un unlock ultérieur.
4. **Réseau persisté par wallet** (`walletNetworks[id]`) — switch de
   wallet restaure le réseau associé, pas celui du wallet précédent.
5. **`highestIndex` ne diminue jamais** — même après suppression d'un
   compte côté UI (pas de fonctionnalité en Phase 3).
6. **Dernier wallet non supprimable** — l'item `Oublier` est `disabled`
   si `wallets.length === 1`.
7. **Forget supprime réellement l'entrée keyring** — pas un soft delete.
   Sans phrase de récupération, wallet irrécupérable.
8. **Invariant D-E2.3-1 préservé** — `pickEffectiveNetworkId` valide la
   préférence réseau (connu + même famille que le keyring, SANGO
   legacy ignorée).
