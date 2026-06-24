import { cn } from "@/lib/utils";

export const BRAND_NAME = "Hearth";
export const BRAND_TAGLINE = "Dinner is handled.";
export const BRAND_SECONDARY_TAGLINE = "The operating system for family meals.";

type BrandLogoVariant = "full" | "icon" | "stacked";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showTagline?: boolean;
  className?: string;
}

/**
 * Hearth mark: a minimal flame held by a gathering arc. The glyph uses fixed
 * brand colors and stays decorative because the wrapper carries the accessible
 * "Hearth" label.
 */
function HearthMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      className={className}
    >
      <path
        d="M12 30C16.5 36 31.5 36 36 30"
        fill="none"
        stroke="#F5F1E8"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M24 11C30 17 33 21.5 33 27C33 33 29 38 24 38C19 38 15 33 15 27C15 22.4 17.8 18.2 22 14.5C22.3 18.5 24 21.2 26.5 23.5C27.2 19.8 26.4 16.1 24 11Z"
        fill="#D88B3D"
      />
    </svg>
  );
}

/**
 * App-icon style glyph: a deep-green rounded tile holding the Hearth mark.
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
      <HearthMark className="h-full w-full" />
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
