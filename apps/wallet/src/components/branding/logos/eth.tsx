/**
 * Ethereum — losange bleu/violet #627EEA.
 * Source : spothq/cryptocurrency-icons (CC0-1.0).
 */
export function EthLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Ethereum"
    >
      <g fill="none" fillRule="evenodd">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <g fill="#FFF">
          <path fillOpacity=".602" d="M16.5 4v8.87l7.5 3.35z" />
          <path d="M16.5 4L9 16.22l7.5-3.35z" />
          <path fillOpacity=".602" d="M16.5 21.97v6.03l7.5-10.39z" />
          <path d="M16.5 28v-6.03L9 17.61z" />
          <path fillOpacity=".2" d="M16.5 20.57l7.5-4.35-7.5-3.35z" />
          <path fillOpacity=".602" d="M9 16.22l7.5 4.35v-7.7z" />
        </g>
      </g>
    </svg>
  );
}
