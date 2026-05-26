import { Fragment } from "react";

const ITEMS = [
  "Kai Murukku",
  "Thenkuzhal",
  "Ribbon Pakoda",
  "Nendran Chips",
  "Seedai",
  "Kara Boondhi",
  "Nippattu",
  "Peanut Chikki",
  "Mysore Pak",
  "Tapioca Chips",
  "Adhirasam",
  "Chakli",
];

export default function MarqueeStrip() {
  return (
    <div className="marquee-strip">
      <div className="marquee-inner">
        {/* Track 1 */}
        {ITEMS.map((item, idx) => (
          <Fragment key={`track1-${idx}`}>
            <span className="marquee-item">{item}</span>
            <span className="marquee-dot" aria-hidden="true">●</span>
          </Fragment>
        ))}
        {/* Track 2 (Exact mirror copy for seamless looping handoff) */}
        {ITEMS.map((item, idx) => (
          <Fragment key={`track2-${idx}`}>
            <span className="marquee-item">{item}</span>
            <span className="marquee-dot" aria-hidden="true">●</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}