# Dérivation HD — spécification interopérable

**Statut** : proposition Phase 5 — contrat entre `@sango/wallet-core` (TS)
et `sango-wallet` (Rust).
**Portée** : comment une phrase BIP-39 devient plusieurs identités
cryptographiques (SANGO, EVM, Bitcoin) de manière **déterministe et
vérifiable**.

---

## 1. Objectif

Un portefeuille = **une phrase BIP-39** (= une « mnemonic »).
Cette phrase donne accès à **N chaînes** sans que l'utilisateur ait à
choisir son réseau à la création.

Modèle cible (Trust Wallet / Phantom / Backpack) :

    Phrase BIP-39 (12 mots)
        ↓ PBKDF2-HMAC-SHA512("mnemonic" || passphrase, 2048)
    BIP-39 seed (64 bytes)
        │
        ├─ SLIP-0010  Ed25519    → SANGO  (adresse bech32m)
        ├─ BIP-32     secp256k1  → EVM    (Ethereum, BSC, Base, Arbitrum…)
        └─ BIP-84     secp256k1  → Bitcoin (P2WPKH)

**Conséquence architecturale** : le wallet n'a plus de *famille
intrinsèque*. La famille devient une propriété du **couple
(mnemonic, chemin)**. Le dashboard cesse d'être un agrégateur de
wallets hétérogènes ; il devient une vue d'**une seule identité HD**
projetée sur plusieurs chaînes.

**Le protocole consensus SANGO ne change pas.** La dérivation est une
convention de wallet, pas une règle de consensus. `sango-crypto`
continue de voir uniquement une clé publique Ed25519 et une signature
Ed25519.

---

## 2. Chemins de dérivation

### 2.1 SANGO — SLIP-0010 Ed25519

    m / 44' / COIN_TYPE' / 0' / 0' / 0'

- **purpose = 44'** (BIP-44)
- **coinType = `COIN_TYPE'`** — valeur à figer (voir §2.4)
- **account = 0'**, **change = 0'**, **address_index = 0'**
- SLIP-0010 impose que **tous les niveaux soient durcis** (apostrophe
  obligatoire). Un chemin non-durci est refusé par la spec.

Le `private_key` résultant (32 bytes) est utilisé **directement** comme
seed Ed25519 dans `sango-crypto::NativeKeypair::from_seed([u8; 32])`.
Aucune transformation supplémentaire.

Adresse SANGO :

    public_key  = Ed25519_derive(privkey)          // 32 bytes
    address     = Keccak256("SANGO/ADDRESS/V1" || public_key)[0:20]
    bech32m     = encode(HRP, address)              // HRP "sango" | "tsango"

Fonction `deriveNativeAddress()` déjà implémentée dans
`packages/wallet-core/src/address.ts` — réutilisée telle quelle.

### 2.2 EVM — BIP-32 secp256k1

    m / 44' / 60' / 0' / 0 / 0

Identique à MetaMask, Trust Wallet, Rabby, etc. **Ce chemin est
universel** : toute mnemonic connue produit les mêmes adresses.

Adresse EVM = `keccak256(pubkey_uncompressed[1:])[12:]` (déjà
implémenté dans `deriveEthereumAddress`).

### 2.3 Bitcoin — BIP-84 secp256k1

    mainnet :  m / 84' / 0' / 0' / 0 / 0
    testnet :  m / 84' / 1' / 0' / 0 / 0

P2WPKH native segwit (`bc1q…` / `tb1q…`). Déjà implémenté dans
`packages/wallet-core/src/derivation/bitcoin.ts`.

### 2.4 Coin type SANGO — **provisoire**

**Aucun numéro SLIP-0044 officiel n'est encore attribué à SANGO.**

Pour débloquer l'implémentation sans contaminer `wallet-core` :

- La spec utilise **`9999'`** (espace privé documenté).
- `9999` **n'est pas** exporté comme constante métier (`SANGO_COIN_TYPE`).
- Le jour où la PR `satoshilabs/slips` est acceptée, on remplace la
  valeur dans cette spec **et** dans les tests — le code métier lit
  la valeur depuis un seul endroit (fichier de config wallet-core).

Tant que SANGO n'a pas de mainnet déployé, l'infrastructure reste sur
`sango-devnet` / `sango-testnet` (Q1·C). **On ne crée pas de
`sango-mainnet`.**

---

## 3. Vecteurs de test

**Contrat interopérable** : TS et Rust doivent passer **exactement**
ces vecteurs. Toute divergence est un bug bloquant.

### 3.1 SLIP-0010 — vecteur officiel (sanity de la primitive)

Source : [SLIP-0010 — Test vector 1][slip10].

    seed = 000102030405060708090a0b0c0d0e0f

    m
      chain code : 90046a93de5380a72b5e45010748567d5ea02bbf6522f979e05c0d8d8ca9fffb
      private    : 2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7
      public     : 00a4b2856bfec510abab89753fac1ac0e1112364e7d250545963f135f2a33188ed

    m/0'
      chain code : 8b59aa11380b624e81507a27fedda59fea6d0b779a778918a2fd3590e16e9c69
      private    : 68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3
      public     : 008c8a13df77a28f3445213a0f432fde644acaa215fc72dcdf300d5efaa85d350c

    m/0'/1'
      chain code : 14a538f78c2bf8b11c41d9e885163ef8e58db72bcfbae2f60e856b05268a17db
      private    : b1d0bad404bf35da785a64ca1ac54b2617211d2777696fbffaf208f746ae84f2
      public     : 001932a5270f335bed617d5b935c80aedb1a35bd9fc1e31acafd5372c30f5c1187

**But** : valider l'implémentation SLIP-0010 indépendamment de SANGO
avant de brancher le chemin `m/44'/9999'/…'`.

### 3.2 Mnemonic de référence — « abandon…about »

Utilisée partout (BIP-84, MetaMask, viem, Phantom) :

    mnemonic   = abandon abandon abandon abandon abandon abandon
                 abandon abandon abandon abandon abandon about
    passphrase = ""
    BIP-39 seed = 5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4

### 3.3 Vecteur EVM — `m/44'/60'/0'/0/0`

    address (EIP-55) = 0x9858EfFD232B4033E47d90003D41EC34EcaEda94

Déjà reconnu par MetaMask, viem, ethers, `@scure/bip32`.

### 3.4 Vecteur Bitcoin — `m/84'/1'/0'/0/0` (testnet)

    address = tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl

Déjà testé dans `packages/wallet-chains/src/bitcoin/__tests__/adapter.test.ts`
et `apps/wallet/src/hooks/use-bitcoin-address.test.tsx`.

### 3.5 Vecteur Bitcoin — `m/84'/0'/0'/0/0` (mainnet)

    address = bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu

Vecteur BIP-84 officiel.

### 3.6 Vecteur SANGO — `m/44'/9999'/0'/0'/0'` ✅ *(figé en 5.1.bis)*

**Entrée** : même mnemonic de référence que §3.2.

    mnemonic   = abandon abandon abandon abandon abandon abandon
                 abandon abandon abandon abandon abandon about
    passphrase = ""

**Chemin** : `m/44'/9999'/0'/0'/0'` (tous durcis — SLIP-0010 Ed25519).

**Sortie** :

    private    = b736c780921580894aacf48b5d4b0f8e8557472f408ded838a680bf636a6d110
    public     = f9dbc57dc6652dc4183bd47f31cfce4671d448571204de0dcdd6fb752ed7d94e
    address    = 16e6e7257de0d84e50c3f99c5470e5226893f420
    addressHex = 0x16e6e7257de0d84e50c3f99c5470e5226893f420
    bech32m    = tsango1zmnwwftaurvyu5xrlxw9gu89yf5f8apq464ne9

**Procédure de validation** :

- `packages/wallet-core/src/derivation/__tests__/sango.test.ts`
  (5 assertions déterministes, `describe("vecteur §3.6 (figé 5.1.bis)")`).
- Le wallet Rust `sango-wallet` devra passer **exactement** ces 5
  assertions. Un écart est un bug bloquant côté implémentation —
  jamais une adaptation du test.

**Complément (optionnel)** : le chain code n'est pas exposé par
`SangoIdentity` (inutile pour signer/adresser), mais reste vérifiable
via `slip10DerivePath(seed, [44, 9999, 0, 0, 0]).chainCode` si un
outil tiers en a besoin.

---

## 4. Contrat interopérable TS ↔ Rust

**Règle unique** : un vecteur de test est un **contrat**. S'il diverge
entre TS et Rust, c'est un bug bloquant côté implémentation — jamais
une adaptation de test.

| Élément | Contrat |
|---|---|
| Mnemonic | BIP-39 anglais, 12 mots par défaut (Q4·A) |
| Passphrase | `""` (aucune, à ce stade) |
| BIP-39 seed | PBKDF2-HMAC-SHA512, 2048 iter, 64 bytes |
| SLIP-0010 | Ed25519, **tous les niveaux durcis** |
| Chemin SANGO | `m/44'/9999'/0'/0'/0'` (provisoire) |
| Adresse SANGO | `Keccak256("SANGO/ADDRESS/V1" ‖ pk)[0:20]` |
| HRP bech32m | `sango` (mainnet), `tsango` (testnet/devnet) |

---

## 5. Coexistence avec les wallets v1

**Décision Q5·B** — lecture seule, pas de conversion.

    Keyring
    ├── Entrée v1 (seed Ed25519 random)
    │   └── format legacy — lecture + signature conservées,
    │       aucune nouvelle création
    └── Entrée v2 (mnemonic BIP-39 chiffrée)
        └── N chaînes dérivées

**Aucune conversion seed → mnemonic.** Ces formats coexistent, ils ne
fusionnent pas. Un wallet v1 ne « devient » jamais v2 — l'utilisateur
peut créer un v2 à côté, avec ses propres fonds.

**Ne pas supprimer un v1** : un v1 contient potentiellement des fonds.
Une suppression n'est possible que par Forget explicite (Phase 3.4),
jamais par migration automatique.

### 5.1 Modèle de session (D-Phase5-2)

Le store de session (`apps/wallet/src/stores/wallet-store.ts`) expose
`family` comme un état **dérivé** du `networkId` actif :

    wallet (V2)
      ├── identité HD universelle
      │
      ├── walletNetworks[id]      ← dernier réseau actif (persisté)
      │
      ▼
    networkId                     ← réseau actif du store
      ▼
    family                        ← dérivé via resolveChainFamily()

**Un wallet V2 n'a pas de famille intrinsèque.** Les familles
disponibles sont déterminées par les capacités de dérivation du
format BIP-39 (via `getIdentity` / `getBitcoinIdentity` /
`getSangoIdentity`) et le registre des réseaux. `walletNetworks[id]`
ne mémorise **que le dernier réseau actif** — il ne représente pas
un ensemble de réseaux activés.

**Conséquence pratique** : `setNetworkId` accepte toute transition
vers un réseau **connu**, y compris cross-family (SANGO ↔ EVM ↔
Bitcoin). Seul V1 (`sango-legacy`) reste contraint à SANGO — il ne
peut dériver qu'une identité Ed25519 et n'a pas d'accès multi-famille.

**Ne pas confondre `format === "bip39"` avec une famille.** Le
discriminant V1/V2 est `format !== "sango-legacy"` : c'est la
capacité à dériver plusieurs familles, pas une famille en soi.

---

## 6. Ce que cette spec ne couvre PAS

- **Chiffrement du keyfile** : couvert par `storage.ts` (`StoredWalletV2`).
- **Interface UI / routes** : couvertes en 5.3–5.5.
- **Coin type officiel SANGO** : en attente SLIP-0044.
- **Mainnet SANGO** : n'existe pas encore (Q1·C).
- **Comptes multiples au-delà de `accountIndex=0`** : à spécifier
  si Phase 6 a besoin de `m/44'/…/1'` / `m/84'/…/1/…`.

---

## 7. Références

- [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki)
- [SLIP-0010](https://github.com/satoshilabs/slips/blob/master/slip-0010.md)
- [SLIP-0044](https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
- [SLIP-0010 — Test vector 1](https://github.com/satoshilabs/slips/blob/master/slip-0010.md#test-vector-1-for-ed25519)

[slip10]: https://github.com/satoshilabs/slips/blob/master/slip-0010.md
