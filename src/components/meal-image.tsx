"use client";

import Image from "next/image";
import { useState } from "react";
import { ChefHat } from "lucide-react";
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
          "flex h-full min-h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f5f1e8,#d88b3d_52%,#8baa8b)] text-primary",
          className
        ]
          .filter(Boolean)
          .join(" ")}
        role="img"
      >
        <ChefHat className="h-10 w-10 opacity-70" />
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
