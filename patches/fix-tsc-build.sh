#!/bin/sh
# Fix 3 erreurs tsc -b découvertes par Vercel build:
#   - isNeutral unused (x2)
#   - fromVersion unused (preferences-store)
set -eu
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node required"; exit 1
fi

# 1) history-list-bitcoin.tsx — retirer la ligne isNeutral unused
FILE="apps/wallet/src/features/bitcoin/history-list-bitcoin.tsx"
if grep -q '^\s*const isNeutral = direction === "neutral";$' "$FILE"; then
  sed -i '/^[[:space:]]*const isNeutral = direction === "neutral";$/d' "$FILE"
  echo "✅ $FILE: removed isNeutral"
else
  echo "⏭  $FILE: already clean or pattern differs"
fi

# 2) history-list-evm.tsx — idem
FILE="apps/wallet/src/features/evm/history-list-evm.tsx"
if grep -q '^\s*const isNeutral = direction === "neutral";$' "$FILE"; then
  sed -i '/^[[:space:]]*const isNeutral = direction === "neutral";$/d' "$FILE"
  echo "✅ $FILE: removed isNeutral"
else
  echo "⏭  $FILE: already clean or pattern differs"
fi

# 3) preferences-store.ts — renommer fromVersion en _fromVersion
FILE="apps/wallet/src/stores/preferences-store.ts"
if grep -q 'migrate: (persisted, fromVersion)' "$FILE"; then
  sed -i 's/migrate: (persisted, fromVersion)/migrate: (persisted, _fromVersion)/' "$FILE"
  echo "✅ $FILE: renamed fromVersion → _fromVersion"
else
  echo "⏭  $FILE: already clean or pattern differs"
fi

echo ""
echo "🎉 3 fixes applied."
