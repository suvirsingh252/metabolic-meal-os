import {
  classifyRecipeUrl,
  isProbablyUrl,
  RecipeParserError,
  validateRecipeUrl
} from "../src/lib/integrations/recipe-parser";

type Case = {
  label: string;
  value: string;
  probablyUrl: boolean;
  classification?: ReturnType<typeof classifyRecipeUrl>;
  normalizedIncludes?: string;
  shouldBlock?: boolean;
};

const cases: Case[] = [
  {
    label: "recipe URL with tracking params",
    value: "https://example.com/recipes/chana?utm_source=share&x=1",
    probablyUrl: true,
    classification: "recipe-page",
    normalizedIncludes: "x=1"
  },
  {
    label: "bare TikTok share link",
    value: "vm.tiktok.com/ZMhRecipe/",
    probablyUrl: true,
    classification: "short-link"
  },
  {
    label: "bare TikTok creator video path",
    value: "tiktok.com/@creator/video/7350000000000000000",
    probablyUrl: true,
    classification: "social-video"
  },
  {
    label: "Instagram Reel",
    value: "https://www.instagram.com/reel/ABC123/?igsh=abc",
    probablyUrl: true,
    classification: "social-video"
  },
  {
    label: "YouTube Shorts",
    value: "https://youtube.com/shorts/ABC123?si=share",
    probablyUrl: true,
    classification: "social-video"
  },
  {
    label: "manual text",
    value: "chana masala with rice and yogurt",
    probablyUrl: false
  },
  {
    label: "blocked local URL",
    value: "http://127.0.0.1:3000/recipe",
    probablyUrl: true,
    shouldBlock: true
  }
];

for (const item of cases) {
  const actualProbablyUrl = isProbablyUrl(item.value);

  if (actualProbablyUrl !== item.probablyUrl) {
    throw new Error(
      `${item.label}: expected probablyUrl=${item.probablyUrl}, got ${actualProbablyUrl}`
    );
  }

  if (!item.probablyUrl) {
    continue;
  }

  try {
    const url = validateRecipeUrl(item.value);

    if (item.shouldBlock) {
      throw new Error(`${item.label}: expected URL to be blocked`);
    }

    if (item.classification) {
      const actualClassification = classifyRecipeUrl(url);

      if (actualClassification !== item.classification) {
        throw new Error(
          `${item.label}: expected ${item.classification}, got ${actualClassification}`
        );
      }
    }

    if (
      item.normalizedIncludes &&
      !url.toString().includes(item.normalizedIncludes)
    ) {
      throw new Error(
        `${item.label}: normalized URL did not preserve ${item.normalizedIncludes}`
      );
    }

    if (url.toString().includes("utm_") || url.toString().includes("igsh=")) {
      throw new Error(`${item.label}: tracking params were not stripped`);
    }
  } catch (error) {
    if (item.shouldBlock && error instanceof RecipeParserError) {
      continue;
    }

    throw error;
  }
}

console.log(`Recipe intake validation passed (${cases.length} cases).`);
