"use client";

import { useEffect, useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MealImageUpload({
  hasImage,
  mealId,
  shouldAutoResolve
}: {
  hasImage: boolean;
  mealId: string;
  shouldAutoResolve: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasAttemptedResolve = useRef(false);

  useEffect(() => {
    if (
      hasAttemptedResolve.current ||
      hasImage ||
      !shouldAutoResolve
    ) {
      return;
    }

    hasAttemptedResolve.current = true;
    setIsResolving(true);
    setMessage("Generating image...");

    fetch(`/api/meals/${mealId}/image/resolve`, { method: "POST" })
      .then(async (response) => {
        const data: unknown = await response.json();

        if (!response.ok) {
          const error =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Image preparation failed.";
          setMessage(error);
          return;
        }

        const imageUrl =
          typeof data === "object" &&
          data !== null &&
          "imageUrl" in data &&
          typeof data.imageUrl === "string"
            ? data.imageUrl
            : null;
        const imageStatus =
          typeof data === "object" &&
          data !== null &&
          "imageStatus" in data &&
          typeof data.imageStatus === "string"
            ? data.imageStatus
            : null;

        if (imageUrl) {
          window.location.reload();
          return;
        }

        if (imageStatus === "failed") {
          setMessage("Image generation failed.");
          return;
        }

        setMessage("Image preparation is still pending.");
      })
      .catch(() => {
        setMessage("Unable to prepare image right now.");
      })
      .finally(() => {
        setIsResolving(false);
      });
  }, [hasImage, mealId, shouldAutoResolve]);

  async function upload(file: File) {
    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("image", file);

    try {
      const response = await fetch(`/api/meals/${mealId}/image`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const data: unknown = await response.json();
        const error =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Image upload failed.";
        setMessage(error);
        return;
      }

      setMessage("Image updated.");
      window.location.reload();
    } catch {
      setMessage("Unable to upload image right now.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          if (file) {
            void upload(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      <Button
        disabled={isUploading || isResolving}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="secondary"
      >
        {isUploading || isResolving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageUp className="h-4 w-4" />
        )}
        {isResolving ? "Generating image" : "Replace image"}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
