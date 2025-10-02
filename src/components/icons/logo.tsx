import type { SVGProps } from "react";

export function HBLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 40"
      width="100"
      height="40"
      aria-label="HB Jewelry Logo"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--secondary))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--primary))" }} />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        fontFamily="'PT Sans', sans-serif"
        fontSize="30"
        fontWeight="bold"
        fill="url(#logoGradient)"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        HB
      </text>
    </svg>
  );
}
