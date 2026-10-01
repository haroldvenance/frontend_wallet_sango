import type {
  AccountRef,
  AccountState,
  Address,
  AssetRef,
  Balance,
  ChainRegistry,
  Delegation,
  FeeEstimate,
  FeeParams,
  PendingUnbonding,
  SendParams,
  Signer,
  Token,
  TxDetail,
  TxDetailPage,
  TxHistory,
  ValidatorInfo,
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
   * État complet d'un compte (adresse + publicKey + balance + nonce).
   *
   * Retourne `null` si le compte n'existe pas encore on-chain
   * (compte "ghost"). L'UI décide de l'affichage.
   *
   * D-SESS-4.
   */
  getAccount(account: AccountRef): Promise<AccountState | null>;

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
   * Délégations émises par le compte. Tableau vide si aucune.
   *
   * D-SESS-11 — `StakingProvider` (lecture seule). L'adresse du
   * délégateur est dérivée de l'`AccountRef`, comme pour `getBalance`.
   */
  getDelegations(account: AccountRef): Promise<readonly Delegation[]>;

  /**
   * Événements d'unbonding en attente de maturation pour le compte.
   */
  getPendingUnbondings(
    account: AccountRef,
  ): Promise<readonly PendingUnbonding[]>;

  /**
   * Liste complète des validateurs enregistrés (tableau vide si aucun).
   *
   * Pas d'`AccountRef` : c'est une lecture réseau.
   */
  listValidators(networkId: string): Promise<readonly ValidatorInfo[]>;

  /**
   * Info d'un validateur précis, ou `null` s'il n'est pas enregistré.
   *
   * Pas d'`AccountRef` : c'est une lecture réseau.
   */
  getValidatorInfo(
    networkId: string,
    validator: Address,
  ): Promise<ValidatorInfo | null>;

  /**
   * Détail d'une transaction par hash (D-SESS-9).
   *
   * **Réseau-centric** : n'importe qui peut consulter n'importe quelle
   * tx. Pas d'`AccountRef`.
   */
  getTransactionByHash(
    networkId: string,
    hash: string,
  ): Promise<TxDetail | null>;

  /**
   * Page de transactions émises par un compte (D-SESS-9).
   *
   * **Compte-centric** : l'adresse est dérivée de l'`AccountRef`.
   */
  getTransactionPage(
    account: AccountRef,
    limit: number,
    offset: number,
  ): Promise<TxDetailPage>;

  /**
   * Liste les tokens ERC-20 configurés pour un réseau (E1.6).
   *
   * Retourne uniquement les tokens officiellement enregistrés dans
   * `EVM_TOKENS` (USDC, USDT). Pas de découverte auto.
   */
  listTokens(networkId: string): Promise<readonly Token[]>;

  /**
   * Solde d'un token ERC-20 pour un compte (base units du token).
   *
   * `token.networkId` doit correspondre à `account.networkId`.
   */
  getTokenBalance(account: AccountRef, token: Token): Promise<bigint>;

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

  async getAccount(account: AccountRef): Promise<AccountState | null> {
    const adapter = this.#adapter(account.networkId);

    if (!adapter.accountProvider) {
      throw new Error(
        `WalletSession: no account provider for network "${account.networkId}"`,
      );
    }

    const address = await adapter.addressProvider.deriveAddress(account);
    return adapter.accountProvider.getAccount(address);
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

    const sender = await adapter.addressProvider.deriveAddress(account);
    const unsigned = await adapter.transactionBuilder.build(params, sender);
    const signed = await adapter.transactionSigner.sign(
      unsigned,
      this.signer,
      account,
    );
    return adapter.broadcaster.broadcast(signed);
  }

  async getDelegations(account: AccountRef): Promise<readonly Delegation[]> {
    const adapter = this.#adapter(account.networkId);
    const provider = this.#stakingProvider(account.networkId);
    const address = await adapter.addressProvider.deriveAddress(account);
    return provider.getDelegations(address);
  }

  async getPendingUnbondings(
    account: AccountRef,
  ): Promise<readonly PendingUnbonding[]> {
    const adapter = this.#adapter(account.networkId);
    const provider = this.#stakingProvider(account.networkId);
    const address = await adapter.addressProvider.deriveAddress(account);
    return provider.getPendingUnbondings(address);
  }

  async listValidators(networkId: string): Promise<readonly ValidatorInfo[]> {
    const provider = this.#stakingProvider(networkId);
    return provider.listValidators();
  }

  async getValidatorInfo(
    networkId: string,
    validator: Address,
  ): Promise<ValidatorInfo | null> {
    const provider = this.#stakingProvider(networkId);
    return provider.getValidatorInfo(validator);
  }

  async getTransactionByHash(
    networkId: string,
    hash: string,
  ): Promise<TxDetail | null> {
    const provider = this.#txDetailProvider(networkId);
    return provider.getTransactionByHash(hash);
  }

  async getTransactionPage(
    account: AccountRef,
    limit: number,
    offset: number,
  ): Promise<TxDetailPage> {
    const adapter = this.#adapter(account.networkId);
    const provider = this.#txDetailProvider(account.networkId);
    const address = await adapter.addressProvider.deriveAddress(account);
    return provider.getTransactionsByAddress(address, limit, offset);
  }

  async listTokens(networkId: string): Promise<readonly Token[]> {
    const adapter = this.#adapter(networkId);
    if (!adapter.tokenProvider) {
      throw new Error(
        `WalletSession: no token provider for network "${networkId}"`,
      );
    }
    return adapter.tokenProvider.listTokens(networkId);
  }

  async getTokenBalance(account: AccountRef, token: Token): Promise<bigint> {
    if (token.networkId !== account.networkId) {
      throw new Error(
        `WalletSession.getTokenBalance: token network "${token.networkId}" does not match account network "${account.networkId}"`,
      );
    }
    const adapter = this.#adapter(account.networkId);
    if (!adapter.tokenProvider) {
      throw new Error(
        `WalletSession: no token provider for network "${account.networkId}"`,
      );
    }
    const address = await adapter.addressProvider.deriveAddress(account);
    return adapter.tokenProvider.getTokenBalance(address, token);
  }

  explorerLink(account: AccountRef, txHash: string): string | undefined {
    const network = this.#network(account.networkId);
    if (!network.explorer) return undefined;
    const { baseUrl, txPath } = network.explorer;
    return `${baseUrl}${txPath.replace("{hash}", txHash)}`;
  }

  #txDetailProvider(networkId: string) {
    const adapter = this.#adapter(networkId);
    if (!adapter.txDetailProvider) {
      throw new Error(
        `WalletSession: no tx detail provider for network "${networkId}"`,
      );
    }
    return adapter.txDetailProvider;
  }

  #stakingProvider(networkId: string) {
    const adapter = this.#adapter(networkId);
    if (!adapter.stakingProvider) {
      throw new Error(
        `WalletSession: no staking provider for network "${networkId}"`,
      );
    }
    return adapter.stakingProvider;
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
