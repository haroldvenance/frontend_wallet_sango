export interface Bip44PathParts {
  readonly purpose: number;
  readonly coinType: number;
  readonly account: number;
  readonly change: number;
  readonly index: number;
}

const PATH_REGEX = /^m\/(\d+)'?\/(\d+)'?\/(\d+)'?\/(\d+)'?\/(\d+)'?$/;

export function parseBip44Path(path: string): Bip44PathParts {
  const normalized = path.replace(/[hH]/g, "'");
  const match = PATH_REGEX.exec(normalized);
  if (!match) {
    throw new Error(`Invalid BIP-44 path: ${path}`);
  }
  const [, purposeS, coinTypeS, accountS, changeS, indexS] = match;
  return {
    purpose: Number.parseInt(purposeS!, 10),
    coinType: Number.parseInt(coinTypeS!, 10),
    account: Number.parseInt(accountS!, 10),
    change: Number.parseInt(changeS!, 10),
    index: Number.parseInt(indexS!, 10),
  };
}

export function formatBip44Path(parts: Bip44PathParts): string {
  return [
    "m",
    `${parts.purpose}'`,
    `${parts.coinType}'`,
    `${parts.account}'`,
    String(parts.change),
    String(parts.index),
  ].join("/");
}
