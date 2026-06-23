import assert from "node:assert/strict";
import test from "node:test";
import { getAnalyzePrimaryCtaLabel } from "@/src/app/analyze/components/meal-input-panel";
import { prepareRecipeForMealAnalysis } from "@/src/lib/ai/meal-analysis/v1/recipe-prep";
import {
  buildInstagramMealCandidate,
  buildSocialMealCandidate,
  canonicalizeInstagramUrl,
  extractSocialMetadataFromHtml,
  fetchStaticSocialMetadata,
  formatSocialMealCandidateForAnalysis,
  supportsIntakeV2Instagram,
  type IntakeEnrichmentResult
} from "@/src/lib/intake-v2";
import {
  basicRecipeParserAdapter,
  parseRecipeJsonLd,
  RecipeParserError
} from "@/src/lib/integrations/recipe-parser";

const instagramFixture = `
<!doctype html>
<html>
  <head>
    <title>@familycook on Instagram: Chana bowl recipe</title>
    <meta property="og:title" content="@familycook on Instagram: Chana bowl recipe" />
    <meta property="og:description" content="Recipe: chana, rice, cucumber, yogurt. Cook chana with tomato masala and serve with rice." />
    <meta name="description" content="Easy dinner reel with ingredients and method." />
    <meta property="og:image" content="https://cdn.example.test/chana.jpg" />
  </head>
  <body>
    <main>
      <p>Caption: Ingredients include chana, rice, cucumber, yogurt, tomato, onion, garlic, cumin, and salt.</p>
      <p>Method: cook the masala, add chana, simmer, and serve with rice.</p>
    </main>
  </body>
</html>
`;

const instagramLoginWallFixture = `
<!doctype html>
<html>
  <head>
    <title>Login • Instagram</title>
    <meta property="og:title" content="Instagram" />
    <meta name="description" content="Log in to Instagram" />
    <meta property="og:description" content="Sign up • Instagram" />
  </head>
  <body>
    <main>Log in to Instagram to see photos and videos from friends.</main>
  </body>
</html>
`;

function enrichment(overrides: Partial<IntakeEnrichmentResult> = {}): IntakeEnrichmentResult {
  return {
    originalUrl: "https://www.instagram.com/reel/DY2N3huNLJN/?igsh=abc",
    canonicalUrl: "https://www.instagram.com/reel/DY2N3huNLJN/",
    platform: "instagram",
    shortcode: "DY2N3huNLJN",
    contentType: "reel",
    metadata: {},
    evidence: [],
    status: "best_effort_estimate",
    ...overrides
  };
}

test("Intake v2 canonicalizes Instagram reel URLs and strips igsh", () => {
  const result = canonicalizeInstagramUrl(
    "https://www.instagram.com/reel/DY2N3huNLJN/?igsh=ZGZtaWhvbmxkamk="
  );

  assert.equal(result?.canonicalUrl, "https://www.instagram.com/reel/DY2N3huNLJN/");
  assert.equal(result?.originalUrl, "https://www.instagram.com/reel/DY2N3huNLJN/?igsh=ZGZtaWhvbmxkamk=");
  assert.equal(result?.shortcode, "DY2N3huNLJN");
  assert.equal(result?.contentType, "reel");
});

test("Intake v2 canonicalizes Instagram post variants", () => {
  assert.equal(
    canonicalizeInstagramUrl("instagram.com/p/ABC123/?utm_source=ig_web_copy_link")
      ?.canonicalUrl,
    "https://www.instagram.com/p/ABC123/"
  );
  assert.equal(
    canonicalizeInstagramUrl("https://m.instagram.com/reel/XYZ789/?igshid=old")
      ?.canonicalUrl,
    "https://www.instagram.com/reel/XYZ789/"
  );
});

test("Intake v2 only supports Instagram content URLs", () => {
  assert.equal(supportsIntakeV2Instagram("https://www.instagram.com/reel/DY2N3huNLJN/"), true);
  assert.equal(supportsIntakeV2Instagram("https://www.instagram.com/p/ABC123/"), true);
  assert.equal(supportsIntakeV2Instagram("https://www.instagram.com/somechef/"), false);
  assert.equal(supportsIntakeV2Instagram("https://www.instagram.com/"), false);
});

test("social share payload text becomes evidence", async () => {
  const result = await buildInstagramMealCandidate(
    {
      kind: "social_share_payload",
      originalUrl: "https://www.instagram.com/reel/DY2N3huNLJN/",
      sharedText: "Recipe: tofu, rice, cucumber. Cook tofu until crisp."
    },
    async () => ({ metadata: {}, evidence: [] })
  );

  assert.equal(result.enrichment.evidence[0]?.kind, "share_sheet_text");
  assert.equal(result.candidate.confidence, "medium");
  assert.match(result.analysisText, /Social meal intake v2 candidate/);
});

test("selectedText and pageDescription become caption-like evidence", async () => {
  const result = await buildInstagramMealCandidate(
    {
      kind: "url",
      originalUrl: "https://www.instagram.com/p/ABC123/",
      selectedText: "Ingredients: paneer, peppers, onion. Cook in masala.",
      pageDescription: "Recipe reel for paneer wraps."
    },
    async () => ({ metadata: {}, evidence: [] })
  );

  assert.equal(
    result.enrichment.evidence.some((item) => item.kind === "user_text"),
    true
  );
  assert.equal(
    result.enrichment.evidence.some((item) => item.field === "pageDescription"),
    true
  );
  assert.equal(result.enrichment.status, "recipe_caption_found");
});

test("metadata extraction reads static Instagram-like HTML fixtures", () => {
  const result = extractSocialMetadataFromHtml(instagramFixture);

  assert.equal(result.metadata.ogTitle, "@familycook on Instagram: Chana bowl recipe");
  assert.equal(result.metadata.thumbnailUrl, "https://cdn.example.test/chana.jpg");
  assert.match(result.metadata.captionText ?? "", /Ingredients include chana/);
  assert.equal(
    result.evidence.some((item) => item.kind === "instagram_metadata"),
    true
  );
});

test("metadata extraction drops Instagram login-wall boilerplate evidence", () => {
  const result = extractSocialMetadataFromHtml(instagramLoginWallFixture);

  assert.equal(result.metadata.title, null);
  assert.equal(result.metadata.ogTitle, null);
  assert.equal(result.metadata.description, null);
  assert.equal(result.metadata.ogDescription, null);
  assert.equal(
    result.evidence.some(
      (item) => item.kind === "open_graph" && item.field !== "thumbnailUrl"
    ),
    false
  );
});

test("static metadata fetch rejects unsafe non-Instagram URLs before fetching", async () => {
  await assert.rejects(
    fetchStaticSocialMetadata("http://127.0.0.1/reel/DY2N3huNLJN/"),
    RecipeParserError
  );
});

test("URL-only Instagram can proceed to low-confidence candidate", () => {
  const candidate = buildSocialMealCandidate(
    enrichment({
      metadata: { title: "Instagram reel" },
      evidence: [
        {
          kind: "instagram_metadata",
          label: "Instagram metadata unavailable",
          text: "The caption was not available from static page metadata.",
          confidence: "low"
        }
      ],
      status: "caption_unavailable_best_effort"
    })
  );

  assert.equal(candidate.confidence, "low");
  assert.equal(candidate.servings, null);
  assert.ok(candidate.missingDetails.includes("Exact quantities"));
  assert.match(
    formatSocialMealCandidateForAnalysis({ enrichment: enrichment(), candidate }),
    /Do not invent exact quantities/
  );
});

test("caption-like evidence increases confidence", () => {
  const candidate = buildSocialMealCandidate(
    enrichment({
      evidence: [
        {
          kind: "share_sheet_text",
          label: "Shared text",
          text: "Recipe: dal, rice, spinach. Cook dal with garlic and serve over rice.",
          confidence: "medium"
        }
      ],
      status: "recipe_caption_found"
    })
  );

  assert.equal(candidate.confidence, "medium");
  assert.ok(candidate.sourceEvidence.some((item) => item.kind === "share_sheet_text"));
});

test("prepareRecipeForMealAnalysis preserves Instagram notes as Intake v2 evidence", async () => {
  const prepared = await prepareRecipeForMealAnalysis(
    {
      recipeText:
        "https://www.instagram.com/reel/DY2N3huNLJN/?igsh=abc\n\nNotes: paneer, peppers"
    },
    {
      instagramMetadataLoader: async () => ({ metadata: {}, evidence: [] })
    }
  );

  assert.equal(prepared.sourceUrl, "https://www.instagram.com/reel/DY2N3huNLJN/");
  assert.equal(prepared.parserVersion, "intake-v2-social-v1");
  assert.equal(prepared.socialRecipeCandidate?.confidence, "medium");
  assert.match(prepared.analysisText, /Shared text \(user_text, medium\)/);
  assert.match(prepared.analysisText, /Notes: paneer, peppers/);
});

test("prepareRecipeForMealAnalysis exercises Instagram URL-only production path", async () => {
  const prepared = await prepareRecipeForMealAnalysis(
    {
      recipeText: "https://www.instagram.com/reel/DY2N3huNLJN/?igsh=abc"
    },
    {
      instagramMetadataLoader: async () => ({
        metadata: {},
        evidence: [
          {
            kind: "instagram_metadata",
            label: "Instagram metadata unavailable",
            text: "The caption was not available from static page metadata.",
            confidence: "low"
          }
        ]
      })
    }
  );

  assert.equal(prepared.sourceUrl, "https://www.instagram.com/reel/DY2N3huNLJN/");
  assert.equal(prepared.parserVersion, "intake-v2-social-v1");
  assert.ok(prepared.socialRecipeCandidate);
  assert.equal(prepared.socialRecipeCandidate.confidence, "low");
  assert.ok(prepared.socialRecipeCandidate.assumptions.length > 0);
  assert.ok(prepared.socialRecipeCandidate.missingDetails.length > 0);
});

test("prepareRecipeForMealAnalysis rejects Instagram profile URLs from Intake v2", async () => {
  await assert.rejects(
    prepareRecipeForMealAnalysis({
      recipeText: "https://www.instagram.com/somechef/"
    }),
    (error) =>
      error instanceof RecipeParserError &&
      /Paste the caption/.test(error.message)
  );
});

test("caption under Instagram URL improves Intake v2 confidence", async () => {
  const urlOnly = await prepareRecipeForMealAnalysis(
    {
      recipeText: "https://www.instagram.com/reel/DY2N3huNLJN/"
    },
    {
      instagramMetadataLoader: async () => ({ metadata: {}, evidence: [] })
    }
  );
  const withCaption = await prepareRecipeForMealAnalysis(
    {
      recipeText:
        "https://www.instagram.com/reel/DY2N3huNLJN/\n\nRecipe: dal, rice, spinach. Cook dal with garlic and serve over rice."
    },
    {
      instagramMetadataLoader: async () => ({ metadata: {}, evidence: [] })
    }
  );

  assert.equal(urlOnly.socialRecipeCandidate?.confidence, "low");
  assert.equal(withCaption.socialRecipeCandidate?.confidence, "medium");
  assert.match(withCaption.analysisText, /Shared text \(user_text, medium\)/);
  assert.match(withCaption.analysisText, /dal, rice, spinach/);
  assert.equal(withCaption.nutritionEstimate?.source, "estimated");
  assert.equal(withCaption.nutritionEstimate?.totals.calories, 385);
  assert.match(withCaption.nutritionEstimate?.provenance ?? "", /recipe ingredients/i);
});

test("Analyze view model never dead-ends for Instagram URL-only", () => {
  assert.equal(
    getAnalyzePrimaryCtaLabel({
      isLoading: false,
      socialFallback: null,
      urlRecovery: null,
      usesBestEffortSocialIntake: true,
      loadingMessage: "Looking for recipe details..."
    }),
    "Analyze best guess"
  );
  assert.equal(
    getAnalyzePrimaryCtaLabel({
      isLoading: true,
      socialFallback: null,
      urlRecovery: null,
      usesBestEffortSocialIntake: true,
      loadingMessage: "Looking for recipe details..."
    }),
    "Looking for recipe details..."
  );
});

test("normal recipe URLs still use the existing parser primitives", () => {
  const parsed = parseRecipeJsonLd(
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Tomato dal",
      recipeIngredient: ["1 cup dal", "2 tomatoes"],
      recipeInstructions: ["Cook dal.", "Add tomatoes."]
    })}</script>`,
    new URL("https://example.com/recipes/tomato-dal"),
    "recipe-page"
  );

  assert.equal(parsed?.source.sourceClassification, "recipe-page");
  assert.deepEqual(parsed?.ingredients.map((item) => item.rawText), [
    "1 cup dal",
    "2 tomatoes"
  ]);
});

test("prepareRecipeForMealAnalysis still routes normal recipe URLs through parser", async () => {
  const originalParseFromUrl = basicRecipeParserAdapter.parseFromUrl;

  basicRecipeParserAdapter.parseFromUrl = async (url) => ({
    name: "Chana dinner",
    source: {
      sourceType: "url",
      sourceUrl: url,
      sourceName: "Example",
      sourceClassification: "recipe-page",
      parserVersion: "test-parser"
    },
    ingredients: [{ rawText: "1 cup chana" }, { rawText: "1 cup rice" }],
    instructions: ["Cook chana.", "Serve with rice."]
  });

  try {
    const prepared = await prepareRecipeForMealAnalysis({
      recipeText: "https://example.com/recipes/chana"
    });

    assert.equal(prepared.sourceClassification, "recipe-page");
    assert.equal(prepared.socialRecipeCandidate, null);
    assert.deepEqual(prepared.ingredients.map((item) => item.rawText), [
      "1 cup chana",
      "1 cup rice"
    ]);
  } finally {
    basicRecipeParserAdapter.parseFromUrl = originalParseFromUrl;
  }
});

test("manual text analysis preparation still works", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "A quick dinner idea with dal, rice, cucumber salad, and yogurt."
  });

  assert.equal(prepared.sourceClassification, "manual-text");
  assert.equal(prepared.socialRecipeCandidate, null);
  assert.match(prepared.analysisText, /quick dinner idea/);
});

test("Pinterest fallback remains unchanged without outbound recipe URL", async () => {
  await assert.rejects(
    prepareRecipeForMealAnalysis({
      recipeText: "https://www.pinterest.com/pin/123456/"
    }),
    (error) =>
      error instanceof RecipeParserError &&
      /Paste the caption/.test(error.message)
  );
});
