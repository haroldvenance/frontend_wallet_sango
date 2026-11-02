#!/bin/sh
# Ajoute dans en.ts / fr.ts :
#   - namespace racine `approvals` (16 clés)
#   - clé `assets.availableBalance`
# Idempotent, backup, self-heal CRLF.

# Self-heal : si CE fichier est en CRLF, se ré-exécute après nettoyage.
if grep -q "$(printf '\r')" "$0" 2>/dev/null; then
  tr -d '\r' < "$0" > "$0.tmp" && mv "$0.tmp" "$0"
  exec sh "$0" "$@"
fi

set -eu

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node not found"
  exit 1
fi

# ──────────────────────────────────────────────────────────
# en.ts
# ──────────────────────────────────────────────────────────
echo "── en.ts"
FILE="apps/wallet/src/i18n/locales/en.ts"
cp "$FILE" "$FILE.bak"
if FILE_PATH="$FILE" node - <<'NODE'
const fs = require("fs");
const p = process.env.FILE_PATH;
let s = fs.readFileSync(p, "utf8");
let changed = false;

// 1) assets.availableBalance (dans le bloc assets uniquement)
const assetsMatch = s.match(/(\n  assets: \{[\s\S]*?\n  \},)/);
if (!assetsMatch) {
  console.error("❌ assets block not found");
  process.exit(1);
}
if (!assetsMatch[1].includes("availableBalance:")) {
  const block = assetsMatch[1];
  if (!block.includes('sangoName: "SangoCoin",')) {
    console.error("❌ sangoName anchor not found in assets block");
    process.exit(1);
  }
  const newBlock = block.replace(
    /(\n    sangoName: "SangoCoin",)/,
    '$1\n    availableBalance: "Available",'
  );
  s = s.replace(block, newBlock);
  changed = true;
  console.log("✅ added assets.availableBalance");
} else {
  console.log("⏭  assets.availableBalance already present");
}

// 2) approvals namespace (détection précise : 2 espaces + `approvals: {`)
if (/\n  approvals:\s*\{/.test(s)) {
  console.log("⏭  approvals namespace already present");
} else {
  const anchor = `\n  fiat: {\n    indicative: "≈",\n  },`;
  if (!s.includes(anchor)) {
    console.error("❌ anchor `fiat` for approvals not found");
    process.exit(1);
  }
  const APPROVALS = `\n  approvals: {
    title: "Manage an approval",
    subtitle: "Check or modify the authorization granted to a contract to use your tokens.",
    back: "Back to dashboard",
    tokenLabel: "Token",
    tokenPlaceholder: "Select a token",
    spenderLabel: "Contract (spender)",
    spenderInvalid: "Invalid address — expected: 0x followed by 40 hex characters.",
    zeroSpender: "The zero address (0x000…000) cannot spend your tokens. Choose the address of the contract you interact with.",
    currentAllowance: "Current allowance",
    allowanceNone: "No authorization",
    allowanceUnlimited: "Unlimited",
    revoke: "Revoke",
    exactAmount: "Exact amount",
    approve: "Approve",
    approveUnlimited: "Approve an unlimited amount",
    noTokens: "No token configured on this network.",
  },`;
  s = s.replace(anchor, APPROVALS + anchor);
  changed = true;
  console.log("✅ added approvals namespace");
}

if (changed) fs.writeFileSync(p, s);
NODE
then :; else echo "❌ failed"; mv "$FILE.bak" "$FILE"; exit 1; fi

# ──────────────────────────────────────────────────────────
# fr.ts
# ──────────────────────────────────────────────────────────
echo "── fr.ts"
FILE="apps/wallet/src/i18n/locales/fr.ts"
cp "$FILE" "$FILE.bak"
if FILE_PATH="$FILE" node - <<'NODE'
const fs = require("fs");
const p = process.env.FILE_PATH;
let s = fs.readFileSync(p, "utf8");
let changed = false;

// 1) assets.availableBalance
const assetsMatch = s.match(/(\n  assets: \{[\s\S]*?\n  \},)/);
if (!assetsMatch) {
  console.error("❌ assets block not found");
  process.exit(1);
}
if (!assetsMatch[1].includes("availableBalance:")) {
  const block = assetsMatch[1];
  if (!block.includes('sangoName: "SangoCoin",')) {
    console.error("❌ sangoName anchor not found in assets block");
    process.exit(1);
  }
  const newBlock = block.replace(
    /(\n    sangoName: "SangoCoin",)/,
    '$1\n    availableBalance: "Disponible",'
  );
  s = s.replace(block, newBlock);
  changed = true;
  console.log("✅ added assets.availableBalance");
} else {
  console.log("⏭  assets.availableBalance already present");
}

// 2) approvals namespace
if (/\n  approvals:\s*\{/.test(s)) {
  console.log("⏭  approvals namespace already present");
} else {
  const anchor = `\n  fiat: {\n    indicative: "≈",\n  },`;
  if (!s.includes(anchor)) {
    console.error("❌ anchor `fiat` for approvals not found");
    process.exit(1);
  }
  const APPROVALS = `\n  approvals: {
    title: "Gérer une approbation",
    subtitle: "Vérifie ou modifie l'autorisation donnée à un contrat d'utiliser tes tokens.",
    back: "Retour au tableau de bord",
    tokenLabel: "Token",
    tokenPlaceholder: "Sélectionner un token",
    spenderLabel: "Contrat (spender)",
    spenderInvalid: "Adresse invalide — format attendu : 0x suivi de 40 caractères hexadécimaux.",
    zeroSpender: "L'adresse zéro (0x000…000) ne peut pas dépenser tes tokens. Choisis l'adresse du contrat avec lequel tu interagis.",
    currentAllowance: "Autorisation actuelle",
    allowanceNone: "Aucune autorisation",
    allowanceUnlimited: "Illimité",
    revoke: "Révoquer",
    exactAmount: "Montant exact",
    approve: "Approuver",
    approveUnlimited: "Approuver un montant illimité",
    noTokens: "Aucun token configuré sur ce réseau.",
  },`;
  s = s.replace(anchor, APPROVALS + anchor);
  changed = true;
  console.log("✅ added approvals namespace");
}

if (changed) fs.writeFileSync(p, s);
NODE
then :; else echo "❌ failed"; mv "$FILE.bak" "$FILE"; exit 1; fi

echo ""
echo "🎉 i18n additions applied."