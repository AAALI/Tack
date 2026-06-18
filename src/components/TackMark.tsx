/**
 * The Tack mark: a dark rounded card with a single red Pin dot top-left
 * and two faint hairlines suggesting card text. Reads as "a pinned card"
 * at any size. See BRAND.md §4.
 *
 * The mark uses a FIXED brand palette (not theme CSS variables) so it stays
 * legible and identical on every surface, regardless of the user's system or
 * data-theme. The app chrome is light, so the card is a dark mark and the
 * wordmark is dark ink — both high-contrast and readable on light.
 */
const CARD = "#1f1f23"; // dark "pinned card"
const CARD_LINE = "#52525a"; // faint card-text hairlines (contrast the dark card)
const PIN = "#e14b3b"; // brand red
const WORDMARK = "#1b1b1f"; // ink — readable on the light app chrome

export default function TackMark({
  size = 28,
  withWordmark = false,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Tack"
      style={{ display: "block" }}
    >
      <rect x="2.5" y="2.5" width="27" height="27" rx="6" fill={CARD} />
      <circle cx="8" cy="9" r="2.6" fill={PIN} />
      <rect x="13" y="8" width="12" height="1.6" rx="0.8" fill={CARD_LINE} />
      <rect x="7" y="17" width="18" height="1.4" rx="0.7" fill={CARD_LINE} />
      <rect x="7" y="22" width="11" height="1.4" rx="0.7" fill={CARD_LINE} />
    </svg>
  );

  if (!withWordmark) return icon;

  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span
        className="font-display lowercase"
        style={{
          color: WORDMARK,
          fontSize: Math.round(size * 0.72),
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        tack
        <span style={{ color: PIN }}>.</span>
      </span>
    </span>
  );
}
