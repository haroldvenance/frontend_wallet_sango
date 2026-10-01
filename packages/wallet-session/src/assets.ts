import type { Asset, AssetId } from "@sango/wallet-chains";

/**
 * Registre d'assets (métadonnées UI). En V0 c'est un simple
 * dictionnaire en mémoire — les assets natifs sont enregistrés au
 * boot par l'app (`SANGO_NATIVE_ASSET`).
 */
export interface AssetList {
  register(asset: Asset): void;
  get(assetId: AssetId): Asset | undefined;
  list(): readonly Asset[];
}

export class InMemoryAssetList implements AssetList {
  readonly #byId = new Map<AssetId, Asset>();

  register(asset: Asset): void {
    this.#byId.set(asset.id, asset);
  }

  get(assetId: AssetId): Asset | undefined {
    return this.#byId.get(assetId);
  }

  list(): readonly Asset[] {
    return Array.from(this.#byId.values());
  }
}

/** Asset natif SANGO — à enregistrer au boot par l'app. */
export const SANGO_NATIVE_ASSET: Asset = {
  id: "sango",
  symbol: "SANGO",
  decimals: 7,
  kind: "native",
};

/** Asset natif ETH — à enregistrer au boot par l'app (E1+). */
export const ETH_NATIVE_ASSET: Asset = {
  id: "eth",
  symbol: "ETH",
  decimals: 18,
  kind: "native",
};
