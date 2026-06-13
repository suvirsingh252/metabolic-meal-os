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
 * "The Threaded Table" mark — a single continuous, rounded line that reads as a
 * Tablewise "T": a soft horizontal tabletop, a gentle loop on the right
 * suggesting household memory/continuity, and a central stem descending from it.
 * Decorative: the brand name is always conveyed by adjacent text or an
 * aria-label on the wrapper, so the SVG itself is hidden from assistive tech.
 */
function ThreadedTableMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <path
        d="M13 16 C18 14 30 14 35 16 C35 22 27 19 24 25 C22 31 24 34 21 38"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * App-icon style glyph: a deep-green rounded tile with a warm-cream thread.
 * Colors come from brand tokens (`bg-primary` / `text-primary-foreground`) so
 * the mark stays on-brand in any theme context.
 */
function ThreadTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[28%] bg-primary text-primary-foreground",
        className
      )}
    >
      <ThreadedTableMark className="h-[64%] w-[64%]" />
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
        <ThreadTile className="h-9 w-9" />
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <span className={cn("flex flex-col items-center gap-3 text-center", className)}>
        <ThreadTile className="h-14 w-14" />
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
      <ThreadTile className="h-9 w-9" />
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
