import { Button } from "@heroui/react";

const SITE_URL = import.meta.env.VITE_SITE_URL as string | undefined;

const NOT_FOUND_ILLUSTRATION = (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background circle */}
    <circle cx="90" cy="90" r="80" fill="#18181b" />
    <circle cx="90" cy="90" r="80" stroke="#27272a" strokeWidth="1.5" />

    {/* Broken link chain - top */}
    <g transform="translate(52, 40)">
      <path
        d="M20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12V20C4 24.42 7.58 28 12 28C16.42 28 20 24.42 20 20"
        stroke="#006FEE"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Gap / break */}
      <line x1="26" y1="34" x2="36" y2="44" stroke="#27272a" strokeWidth="4" strokeLinecap="round" />
      {/* Broken link chain - bottom */}
      <path
        d="M32 44C32 39.58 35.58 36 40 36C44.42 36 48 39.58 48 44V52C48 56.42 44.42 60 40 60C35.58 60 32 56.42 32 52"
        stroke="#a1a1aa"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
    </g>

    {/* Question mark */}
    <text
      x="90"
      y="128"
      textAnchor="middle"
      fill="#006FEE"
      fontSize="48"
      fontWeight="700"
      fontFamily="Outfit, sans-serif"
      opacity="0.9"
    >
      ?
    </text>

    {/* Floating dots */}
    <circle cx="135" cy="55" r="3" fill="#006FEE" opacity="0.3" />
    <circle cx="45" cy="130" r="2" fill="#a1a1aa" opacity="0.2" />
    <circle cx="145" cy="120" r="2.5" fill="#006FEE" opacity="0.2" />
  </svg>
);

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-canvas px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        {NOT_FOUND_ILLUSTRATION}

        <h1 className="text-2xl font-bold text-text-primary mt-8 mb-2">
          404
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Page not found. The link you followed may be broken, or the page may have been removed.
        </p>

        {SITE_URL && (
          <Button
            color="primary"
            radius="full"
            onPress={() => (window.location.href = SITE_URL)}
          >
            Go to Our Website
          </Button>
        )}
      </div>
    </div>
  );
}
