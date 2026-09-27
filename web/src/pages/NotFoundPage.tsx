import { Button } from "@heroui/react";

const SITE_URL = import.meta.env.VITE_SITE_URL as string | undefined;

const NOT_FOUND_ILLUSTRATION = (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background circle */}
    <circle cx="90" cy="90" r="80" className="fill-surface-elevated" />
    <circle cx="90" cy="90" r="80" className="stroke-border" fill="none" strokeWidth="1.5" />

    {/* Broken link chain - top */}
    <g transform="translate(52, 40)">
      <path
        d="M20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12V20C4 24.42 7.58 28 12 28C16.42 28 20 24.42 20 20"
        className="stroke-accent"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Gap / break */}
      <line x1="26" y1="34" x2="36" y2="44" className="stroke-border" strokeWidth="4" strokeLinecap="round" />
      {/* Broken link chain - bottom */}
      <path
        d="M32 44C32 39.58 35.58 36 40 36C44.42 36 48 39.58 48 44V52C48 56.42 44.42 60 40 60C35.58 60 32 56.42 32 52"
        className="stroke-text-disabled"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>

    {/* Question mark */}
    <text
      x="90"
      y="128"
      textAnchor="middle"
      className="fill-accent-strong"
      fontSize="48"
      fontWeight="500"
      fontFamily="Outfit, sans-serif"
    >
      ?
    </text>

    {/* Floating dots */}
    <circle cx="135" cy="55" r="3" className="fill-accent" opacity="0.5" />
    <circle cx="45" cy="130" r="2" className="fill-text-disabled" opacity="0.6" />
    <circle cx="145" cy="120" r="2.5" className="fill-accent" opacity="0.35" />
  </svg>
);

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-canvas-soft dark:bg-canvas px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        {NOT_FOUND_ILLUSTRATION}

        <h1 className="text-[28px] font-semibold text-text-primary tracking-display mt-8 mb-2">
          404
        </h1>
        <p className="text-[15px] text-text-secondary mb-6">
          Page not found. The link you followed may be broken, or the page may have been removed.
        </p>

        {SITE_URL && (
          <Button
            color="primary"
            className="font-medium"
            onPress={() => (window.location.href = SITE_URL)}
          >
            Go to Our Website
          </Button>
        )}
      </div>
    </div>
  );
}
