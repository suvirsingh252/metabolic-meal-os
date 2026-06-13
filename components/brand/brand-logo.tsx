import { cn } from "@/lib/utils";

export const BRAND_NAME = "Tablewise";
export const BRAND_TAGLINE = "Tablewise remembers what works.";
export const BRAND_SECONDARY_TAGLINE = "Smarter meals for your household.";

type BrandLogoVariant = "full" | "icon" | "stacked";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showTagline?: boolean;
  className?: string;
}

/**
 * Tablewise "Ingredients Bowl" mark — a warm-cream bowl with a subtle
 * integrated "T" on the front and sage / apricot / muted-green ingredient
 * shapes nestled at the rim. It is multi-color (explicit brand hex rather than
 * currentColor) and decorative: the brand name is always conveyed by adjacent
 * text or an aria-label on the wrapper, so the SVG is hidden from assistive tech.
 */
function IngredientsBowlMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      className={className}
    >
      <g transform="translate(24 24) scale(1.12) translate(-24 -28.5)">
        <ellipse cx="24" cy="27" rx="15" ry="4" fill="#DDEBDD" />
        <path
          d="M24 16 C27.5 18 28.5 22.5 24 26.5 C19.5 22.5 20.5 18 24 16 Z"
          fill="#DDEBDD"
        />
        <path d="M24 18.5 L24 25" stroke="#4C8267" strokeWidth="1" strokeLinecap="round" />
        <circle cx="15" cy="24" r="3.6" fill="#F4A261" />
        <circle cx="20" cy="20.5" r="2.8" fill="#4C8267" />
        <circle cx="33" cy="24" r="3.2" fill="#F4A261" />
        <circle cx="29" cy="20.5" r="2.6" fill="#DDEBDD" />
        <path
          d="M8 27 C8 27 13 30 24 30 C35 30 40 27 40 27 C40 34.5 33 41 24 41 C15 41 8 34.5 8 27 Z"
          fill="#FFF8EC"
        />
        <path
          d="M18.5 34 L29.5 34 M24 34 L24 38.5"
          stroke="#1F5E46"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * App-icon style glyph: a deep-green rounded tile holding the bowl mark.
 * The tile background uses the brand token (`bg-primary`) so it stays on-brand
 * in any theme context; the mark's own colors are fixed brand hex.
 */
function IconTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-primary",
        className
      )}
    >
      <IngredientsBowlMark className="h-full w-full" />
    </span>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight text-foreground", className)}>
      {BRAND_NAME}
    </span>
  );
}

export function BrandLogo({
  variant = "full",
  showTagline = false,
  className
}: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <span
        role="img"
        aria-label={BRAND_NAME}
        className={cn("inline-flex", className)}
      >
        <IconTile className="h-9 w-9" />
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <span className={cn("flex flex-col items-center gap-3 text-center", className)}>
        <IconTile className="h-14 w-14" />
        <span className="flex flex-col items-center gap-1">
          <Wordmark className="text-xl" />
          {showTagline ? (
            <span className="text-sm text-muted-foreground">{BRAND_TAGLINE}</span>
          ) : null}
        </span>
      </span>
    );
  }

  // variant === "full"
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <IconTile className="h-9 w-9" />
      <span className="flex min-w-0 flex-col">
        <Wordmark className="truncate text-base" />
        {showTagline ? (
          <span className="truncate text-xs text-muted-foreground">
            {BRAND_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );
}
