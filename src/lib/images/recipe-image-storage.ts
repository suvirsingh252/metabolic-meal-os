import { put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeRecipeUrl } from "@/src/lib/integrations/recipe-parser";

const maxImageBytes = 8_000_000;
const localPublicUploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "recipe-images"
);

export interface StoredRecipeImage {
  url: string;
  contentType: string;
  byteLength: number;
  hash: string;
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  if (contentType.includes("avif")) {
    return "avif";
  }
  return "jpg";
}

async function storeImageBytes(
  bytes: Uint8Array,
  contentType: string,
  prefix: string
): Promise<StoredRecipeImage> {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const extension = extensionForContentType(contentType);
  const pathname = `recipe-images/${prefix}-${hash.slice(0, 24)}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, Buffer.from(bytes), {
      access: "public",
      addRandomSuffix: false,
      contentType
    });

    return { url: blob.url, contentType, byteLength: bytes.byteLength, hash };
  }

  await mkdir(localPublicUploadDir, { recursive: true });
  const filename = `${prefix}-${hash.slice(0, 24)}.${extension}`;
  await writeFile(path.join(localPublicUploadDir, filename), bytes);

  return {
    url: `/uploads/recipe-images/${filename}`,
    contentType,
    byteLength: bytes.byteLength,
    hash
  };
}

export async function storeGeneratedRecipeImage(
  bytes: Uint8Array,
  contentType = "image/png"
) {
  return storeImageBytes(bytes, contentType, "ai");
}

export async function storeManualRecipeImage(
  bytes: Uint8Array,
  contentType = "image/jpeg"
) {
  return storeImageBytes(bytes, contentType, "manual");
}

export async function copyExternalRecipeImage(
  originalUrl: string
): Promise<StoredRecipeImage | null> {
  let url: URL;

  try {
    url = new URL(originalUrl);
  } catch {
    return null;
  }

  await assertSafeRecipeUrl(url);

  let currentUrl = url;
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    await assertSafeRecipeUrl(currentUrl);
    response = await fetch(currentUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; MetabolicMealOS/0.1; +https://metabolic-meal-os.local)"
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000)
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      break;
    }

    const location = response.headers.get("location");

    if (!location) {
      break;
    }

    currentUrl = new URL(location, currentUrl);
  }

  if (!response?.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    return null;
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxImageBytes) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength === 0 || bytes.byteLength > maxImageBytes) {
    return null;
  }

  return storeImageBytes(bytes, contentType, "original");
}
