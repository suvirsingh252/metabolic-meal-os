"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MealImageUpload({ mealId }: { mealId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="secondary"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageUp className="h-4 w-4" />
        )}
        Replace image
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
