import React from "react";

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
        {ITEMS.map((item, idx) => (
          <React.Fragment key={`m1-${idx}`}>
            <span>{item}</span>
            <span className="dot">●</span>
          </React.Fragment>
        ))}
        {ITEMS.map((item, idx) => (
          <React.Fragment key={`m2-${idx}`}>
            <span>{item}</span>
            <span className="dot">●</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
