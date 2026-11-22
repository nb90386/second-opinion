import Link from "next/link";

/** The mark is a statement with one line circled in blue pencil: the product in one glyph. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <rect x="3" y="1.5" width="18" height="23" rx="2.5" fill="#ffffff" stroke="#17211d" strokeWidth="1.5" />
      <path d="M7 7h10M7 18.5h7" stroke="#17211d" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 12.75h10" stroke="#17211d" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="12" cy="12.75" rx="10.5" ry="3.6" fill="none" stroke="#2349a6" strokeWidth="1.8" transform="rotate(-6 12 12.75)" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link className="brand" href="/">
      <BrandMark />
      <span className="brand-word">Second Opinion</span>
    </Link>
  );
}
