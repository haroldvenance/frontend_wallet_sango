import type {
  AccountRef,
  AssetRef,
  Balance,
  ChainRegistry,
  FeeEstimate,
  FeeParams,
  SendParams,
  Signer,
  TxHistory,
} from "@sango/wallet-chains";

import type { AccountList } from "./accounts";
import type { AssetList } from "./assets";

/**
 * Point de contact unique de l'UI avec la blockchain.
 *
 * Toutes les méthodes résolvent le réseau via `chainRegistry` puis
 * délèguent à l'adaptateur correspondant. L'UI ne connaît ni
 * `sango-sdk`, ni `@sango/rpc`, ni aucun provider concret.
 */
export interface WalletSession {
  readonly accounts: AccountList;
  readonly assets: AssetList;
  readonly chainRegistry: ChainRegistry;
  readonly signer: Signer;

  /**
   * Solde d'un asset pour un compte.
   *
   * `account.networkId` doit égaler `assetRef.networkId`.
   */
  getBalance(account: AccountRef, assetRef: AssetRef): Promise<Balance>;

  /**
   * Historique paginé d'un compte.
   *
   * Si `assetRef` est omis, on utilise `account.networkId` comme
   * filtre réseau implicite.
   */
  getHistory(
    account: AccountRef,
    assetRef?: AssetRef,
    limit?: number,
  ): Promise<TxHistory>;

  /**
   * Estimation de frais. Le champ `from` de `params` est ignoré :
   * la session dérive l'adresse depuis `account`.
   */
  estimateFee(params: FeeParams, account: AccountRef): Promise<FeeEstimate>;

  /**
   * Pipeline complet build → sign → broadcast.
   *
   * Le champ `from` de `params` est ignoré : la session dérive
   * l'adresse depuis `account`.
   *
   * @returns le hash de transaction tel que calculé localement (et
   *          confirmé par le nœud).
   */
  send(params: SendParams, account: AccountRef): Promise<string>;

  /**
   * Lien vers l'explorateur pour une tx, ou `undefined` si le réseau
   * n'a pas de config explorer.
   */
  explorerLink(account: AccountRef, txHash: string): string | undefined;
}

export interface WalletSessionConfig {
  readonly chainRegistry: ChainRegistry;
  readonly signer: Signer;
  readonly accounts: AccountList;
  readonly assets: AssetList;
}

export class WalletSessionImpl implements WalletSession {
  readonly accounts: AccountList;
  readonly assets: AssetList;
  readonly chainRegistry: ChainRegistry;
  readonly signer: Signer;

  constructor(config: WalletSessionConfig) {
    this.accounts = config.accounts;
    this.assets = config.assets;
    this.chainRegistry = config.chainRegistry;
    this.signer = config.signer;
  }

  async getBalance(account: AccountRef, assetRef: AssetRef): Promise<Balance> {
    const adapter = this.#adapter(assetRef.networkId);
    this.#assertNetworkMatch(account, assetRef.networkId);

    const address = await adapter.addressProvider.deriveAddress(account);
    return adapter.balanceProvider.getBalance(address, assetRef);
  }

  async getHistory(
    account: AccountRef,
    assetRef?: AssetRef,
    limit = 20,
  ): Promise<TxHistory> {
    const networkId = assetRef?.networkId ?? account.networkId;
    const adapter = this.#adapter(networkId);
    this.#assertNetworkMatch(account, networkId);

    const address = await adapter.addressProvider.deriveAddress(account);
    return adapter.historyProvider.getHistory({
      address,
      assetRef,
      limit,
    });
  }

  async estimateFee(
    params: FeeParams,
    account: AccountRef,
  ): Promise<FeeEstimate> {
    const adapter = this.#adapter(params.assetRef.networkId);
    this.#assertNetworkMatch(account, params.assetRef.networkId);

    if (!adapter.feeEstimator) {
      throw new Error(
        `WalletSession: no fee estimator for network "${params.assetRef.networkId}"`,
      );
    }
    const from = await adapter.addressProvider.deriveAddress(account);
    return adapter.feeEstimator.estimate({ ...params, from });
  }

  async send(params: SendParams, account: AccountRef): Promise<string> {
    const adapter = this.#adapter(params.assetRef.networkId);
    this.#assertNetworkMatch(account, params.assetRef.networkId);

    if (!adapter.transactionBuilder) {
      throw new Error(
        `WalletSession: no transaction builder for network "${params.assetRef.networkId}"`,
      );
    }
    if (!adapter.transactionSigner) {
      throw new Error(
        `WalletSession: no transaction signer for network "${params.assetRef.networkId}"`,
      );
    }
    if (!adapter.broadcaster) {
      throw new Error(
        `WalletSession: no broadcaster for network "${params.assetRef.networkId}"`,
      );
    }

    const from = await adapter.addressProvider.deriveAddress(account);
    const unsigned = await adapter.transactionBuilder.build({ ...params, from });
    const signed = await adapter.transactionSigner.sign(
      unsigned,
      this.signer,
      account,
    );
    return adapter.broadcaster.broadcast(signed);
  }

  explorerLink(account: AccountRef, txHash: string): string | undefined {
    const network = this.#network(account.networkId);
    if (!network.explorer) return undefined;
    const { baseUrl, txPath } = network.explorer;
    return `${baseUrl}${txPath.replace("{hash}", txHash)}`;
  }

  #adapter(networkId: string) {
    const adapter = this.chainRegistry.get(networkId);
    if (!adapter) {
      throw new Error(`WalletSession: no chain adapter for network "${networkId}"`);
    }
    return adapter;
  }

  #network(networkId: string) {
    const network = this.chainRegistry.list().find((n) => n.id === networkId);
    if (!network) {
      throw new Error(`WalletSession: unknown network "${networkId}"`);
    }
    return network;
  }

  #assertNetworkMatch(account: AccountRef, assetNetworkId: string): void {
    if (account.networkId !== assetNetworkId) {
      throw new Error(
        `WalletSession: account network ("${account.networkId}") does not match asset network ("${assetNetworkId}")`,
      );
    }
  }
}

export function createWalletSession(config: WalletSessionConfig): WalletSession {
  return new WalletSessionImpl(config);
}
