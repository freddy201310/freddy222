/** Layered hills-and-sunrise illustration used on the landing and auth pages. */
export function Scenery({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e1eff8" />
          <stop offset="0.6" stopColor="#ffeedd" />
          <stop offset="1" stopColor="#ffd9b5" />
        </linearGradient>
        <radialGradient id="sc-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff8f1" />
          <stop offset="0.5" stopColor="#ffbd85" />
          <stop offset="1" stopColor="#ffbd85" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="520" fill="url(#sc-sky)" />
      <circle cx="980" cy="300" r="190" fill="url(#sc-sun)" />
      <path d="M0 330 L180 230 L320 300 L520 170 L720 290 L880 220 L1060 300 L1260 190 L1440 280 V520 H0Z" fill="#bfdcef" opacity="0.7" />
      <path d="M0 380 C 240 300, 420 360, 640 330 S 1080 270, 1440 340 V520 H0Z" fill="#9fc297" />
      <path d="M0 430 C 300 370, 520 430, 800 400 S 1200 360, 1440 410 V520 H0Z" fill="#76a46c" />
      <path d="M0 480 C 260 440, 600 490, 900 460 S 1260 450, 1440 470 V520 H0Z" fill="#56874d" />
      {[120, 210, 1180, 1290, 1350].map((x, i) => (
        <g key={x} transform={`translate(${x} ${440 + (i % 2) * 14})`}>
          <rect x="-3" y="0" width="6" height="26" fill="#4f3b2b" />
          <path d="M0 -46 L24 4 H-24Z" fill="#365632" />
          <path d="M0 -66 L18 -20 H-18Z" fill="#436c3c" />
        </g>
      ))}
    </svg>
  );
}
