/**
 * The Tack mark: a rounded card with a single red Pin dot top-left
 * and two faint hairlines suggesting card text. Reads as "a pinned card"
 * at any size. See BRAND.md §4.
 *
 * Colours are driven by CSS variables so the mark adapts to light/dark
 * automatically — never hard-code theme hexes here.
 */
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
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="6"
        fill="var(--surface)"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      <circle cx="8" cy="9" r="2.6" fill="var(--pin)" />
      <rect x="13" y="8" width="12" height="1.6" rx="0.8" fill="var(--hairline)" />
      <rect x="7" y="17" width="18" height="1.4" rx="0.7" fill="var(--hairline)" />
      <rect x="7" y="22" width="11" height="1.4" rx="0.7" fill="var(--hairline)" />
    </svg>
  );

  if (!withWordmark) return icon;

  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span
        className="font-display lowercase"
        style={{
          color: "var(--ink)",
          fontSize: Math.round(size * 0.72),
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        tack
        <span style={{ color: "var(--pin)" }}>.</span>
      </span>
    </span>
  );
}
