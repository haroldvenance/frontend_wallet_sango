# Design UX-1 — Dashboard unifié SANGO + EVM

- **Statut** : validé
- **Parent** : `docs/design/e1-evm.md`
- **Portée** : recomposition visuelle unifiée. **Aucun nouveau
  modèle** (wallet/session/store inchangés).
- **Critère d'acceptation** : un wallet SANGO ou BIP-39 affiche le
  même langage visuel (ActionsRow + HeroCard + AssetSection +
  ActivitySection).
- **Non-objectif** : D8 réel, multi-compte HD, ERC-20, BSC, Solana,
  import token custom, pricing API.

## 1. Décisions actées (Q1–Q8)

| # | Sujet | Choix |
|---|---|---|
| Q1 | Assets/chaînes | **C** Screenshots = référence visuelle. Pas de nouveaux assets. |
| Q2 | Multi-compte HD | **B** Reporté E2+ |
| Q3 | Nature refonte | **B** Recomposer sans réécrire |
| Q4 | D8 asset-centric | **B** Visuel D8, modèle `wallet → networkId → asset natif` inchangé. |
| Q5 | Token custom | **B** Reporté E1.6 |
| Q6 | Fiat | **B** Existant (EUR/FCFA opt-in) conservé |
| Q7 | Sélecteur chaîne | **B** Global, basé sur `networkId` |
| Q8 | Routes | **B** `/send`, `/send-evm` restent. Pas de fusion. |

## 2. Composants universels (nouveaux)

- `HeroAssetCard` + `AddressPill` — carte hero, props-based.
- `AssetSection` + `AssetItem` — liste d'assets générique.
- `ActionsRow` — 4 actions (Acheter/Échanger désactivés, Envoyer/Recevoir actifs).
- `ActivitySection` — en-tête + refresh + slot.

## 3. Dispatch par slot

| Slot | SANGO legacy | BIP-39 EVM |
|---|---|---|
| ActionsRow | QuickActions | QuickActionsEvm |
| HeroCard | BalanceCard | BalanceCardEvm |
| AssetSection | AssetList | AssetListEvm |
| Activity | RecentActivity | HistoryListEvm |
| Staking | MyStakingCard | — |
| NetworkInfo | NetworkOverviewCard | — |

## 4. Nav items wallet-aware

Les items de la sidebar dispatch selon `wallet.format` :

| Item | SANGO legacy | BIP-39 EVM |
|---|---|---|
| Tableau de bord | `/` | `/` |
| Envoyer | `/send` | `/send-evm` |
| Historique | `/history` | `/history-evm` |
| Validateurs | visible | **caché** |

## 5. Ce que UX-1 ne fait pas

- ❌ ERC-20, tokens custom, BSC, Solana
- ❌ Multi-compte HD UI
- ❌ D8 réel
- ❌ Fusion des routes `/send` et `/send-evm`

## 6. Critère de succès

1. Wallet SANGO : nav complète (4 items), dashboard classique recomposé.
2. Wallet BIP-39 : nav allégée (3 items, pas de Validateurs), dashboard EVM recomposé.
3. Aucune régression de comportement.
