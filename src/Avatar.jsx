import React from "react";

// Deterministic, colourful avatar generated from an alias string.
// Same alias → same avatar, every time. No uploads, no personal data.
// Renders initials on a two-tone background derived from a hash of the alias.

const PALETTE = [
  ["#5FB58C", "#cdeede"], ["#EC9268", "#f7e0d3"], ["#6aa6d6", "#dcecf8"],
  ["#b08ad6", "#ece0f6"], ["#d6a25f", "#f6ecd8"], ["#5fb0b5", "#d8f0f1"],
  ["#c97b9c", "#f5e0ea"], ["#7fa05f", "#e7f0d8"],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h;
}

export default function Avatar({ alias, size = 34, highlight = false }) {
  const h = hash(alias || "");
  const [fg, bg] = PALETTE[h % PALETTE.length];
  const initials = (alias || "").trim().slice(0, 2).toUpperCase() || "··";
  // a soft accent blob, positioned from the hash, for a bit of life
  const cx = 20 + (h % 24);
  const cy = 18 + ((h >> 3) % 20);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`Avatar for ${alias}`} style={{ flexShrink: 0, borderRadius: "50%" }}>
      <rect width="64" height="64" fill={highlight ? fg : bg} rx="32" />
      <circle cx={cx} cy={cy} r="16" fill={fg} opacity={highlight ? 0.25 : 0.22} />
      <text x="32" y="33" textAnchor="middle" dominantBaseline="central" fontFamily='"Inter", sans-serif' fontWeight="600" fontSize="24" fill={highlight ? "#fff" : fg}>{initials}</text>
    </svg>
  );
}
