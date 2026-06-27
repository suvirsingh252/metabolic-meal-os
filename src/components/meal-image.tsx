"use client";

import Image from "next/image";
import { useState } from "react";
import { ChefHat, Sparkles } from "lucide-react";
import { getSafeImageUrl } from "@/src/lib/images/image-url";

export function MealImage({
  alt,
  className = "",
  fill = true,
  height,
  imageUrl,
  priority = false,
  sizes,
  width
}: {
  alt: string;
  className?: string;
  fill?: boolean;
  height?: number;
  imageUrl: string | null | undefined;
  priority?: boolean;
  sizes?: string;
  width?: number;
}) {
  const [failed, setFailed] = useState(false);
  const safeUrl = failed ? null : getSafeImageUrl(imageUrl);

  if (!safeUrl) {
    return (
      <div
        aria-label={alt}
        className={[
          "relative flex h-full min-h-full w-full overflow-hidden bg-[linear-gradient(135deg,#173a34_0%,#f5f1e8_58%,#d88b3d_100%)] text-primary",
          className
        ]
          .filter(Boolean)
          .join(" ")}
        role="img"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.34),transparent_28%),radial-gradient(circle_at_78%_72%,rgba(23,58,52,0.18),transparent_34%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/35 to-transparent" />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-md border border-primary/15 bg-background/85 shadow-sm">
            <ChefHat className="h-7 w-7" />
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-background/85 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Hearth meal
          </span>
        </div>
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={["object-cover", className].filter(Boolean).join(" ")}
      fill={fill}
      height={fill ? undefined : height}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      priority={priority}
      sizes={sizes}
      src={safeUrl}
      width={fill ? undefined : width}
    />
  );
}
