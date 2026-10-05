/**
 * Icône générique d'un asset natif (ETH, BNB, …).
 *
 * Basée sur `assetId` — pas couplée à EVM. Le style visuel reste
 * neutre (indigo uniforme, D-UI-4 E1.7.e). Pour Sango legacy, utiliser
 * `SangoCoinIcon` (branding séparé, non absorbé ici).
 *
 * `size` :
 *   - "sm" (40px) → asset-list items
 *   - "md" (44px) → hero balance card
 */

interface NativeAssetIconProps {
  readonly assetId: string;
  readonly size?: "sm" | "md";
}

const SIZES = {
  sm: { box: "size-10", font: "text-sm" },
  md: { box: "size-11", font: "text-lg" },
} as const;

function glyphFor(assetId: string): string {
  switch (assetId) {
    case "eth":
      return "Ξ";
    case "bnb":
      return "BNB";
    default:
      return assetId.slice(0, 3).toUpperCase();
  }
}

export function NativeAssetIcon({
  assetId,
  size = "sm",
}: NativeAssetIconProps) {
  const s = SIZES[size];
  return (
    <div
      className={`flex ${s.box} items-center justify-center rounded-xl bg-indigo-500/10 ${s.font} font-semibold text-indigo-500`}
    >
      {glyphFor(assetId)}
    </div>
  );
}
