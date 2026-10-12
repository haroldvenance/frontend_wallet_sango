/**
 * BNB Chain — losange jaune #F3BA2F.
 * Source : spothq/cryptocurrency-icons (CC0-1.0).
 */
export function BnbLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="BNB Chain"
    >
      <g fill="none">
        <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
        <path
          fill="#FFF"
          d="M12.12 14.4L16 10.52l3.89 3.89 2.26-2.26L16 6l-6.14 6.14 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.12 1.6L16 21.48l3.89-3.89 2.26 2.26L16 26l-6.14-6.14-.01-.01 2.27-2.25zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.19-.01h.01V16L16 18.29l-2.29-2.29-.01-.01.01-.01.4-.4.2-.2L16 13.71l2.29 2.29z"
        />
      </g>
    </svg>
  );
}
