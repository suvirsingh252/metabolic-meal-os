import type { MealFeedbackSummary } from "@/src/lib/domain/feedback";

export type MealIntelligenceLevel = "low" | "medium" | "high";
export type MealIntelligenceConfidence = "low" | "medium" | "high";
export type MealIntelligenceSuitability = "poor" | "fair" | "good" | "excellent";
export type MealSpiceLevel = "mild" | "medium" | "hot" | "unknown";

export interface MealIntelligenceInput {
  id: string;
  mealName: string;
  cuisine: string | null;
  mealType: string | null;
  proteinLevel?: string | null;
  satietyLevel?: string | null;
  bloodSugarImpact?: string | null;
  effortLevel?: string | null;
  familyApproved?: boolean;
  weeknightFriendly?: boolean;
  comfortMeal?: boolean;
  notes?: string | null;
  ingredientsText?: string | null;
  instructionsText?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  fiberG?: number | null;
  qualityScore?: number | null;
  metabolicScore?: number | null;
  proteinScore?: number | null;
  fiberScore?: number | null;
  satietyScoreNumeric?: number | null;
  bloodSugarRiskScore?: number | null;
}

export interface IngredientOverlap {
  mealId: string;
  mealName: string;
  sharedIngredients: string[];
  score: number;
}

export interface SimilarMeal {
  mealId: string;
  mealName: string;
  reasons: string[];
  score: number;
}

export interface MealIntelligence {
  confidence: MealIntelligenceConfidence;
  evidence: string[];
  preparationComplexity: MealIntelligenceLevel;
  activeCookingTimeMinutes: number | null;
  cleanupEffort: MealIntelligenceLevel;
  freezerSuitability: MealIntelligenceSuitability;
  leftoverQuality: MealIntelligenceSuitability;
  mealPrepSuitability: MealIntelligenceSuitability;
  weeknightSuitability: MealIntelligenceSuitability;
  specialOccasionSuitability: MealIntelligenceSuitability;
  familyFriendliness: MealIntelligenceSuitability;
  kidFriendliness: MealIntelligenceSuitability;
  nutritionHighlights: string[];
  proteinDensity: number | null;
  vegetableDensity: MealIntelligenceLevel;
  cuisine: string | null;
  cookingMethod: string | null;
  primaryProtein: string | null;
  spiceLevel: MealSpiceLevel;
  dietaryTags: string[];
  seasonalSuitability: string[];
  estimatedCost: MealIntelligenceLevel;
  ingredientOverlap: IngredientOverlap[];
  similarMeals: SimilarMeal[];
  recommendationSignals: {
    convenience: number;
    nutrition: number;
    family: number;
    variety: number;
    fit: number;
  };
}

const proteinWords = [
  "chicken",
  "beef",
  "pork",
  "turkey",
  "lamb",
  "fish",
  "salmon",
  "tuna",
  "shrimp",
  "egg",
  "eggs",
  "tofu",
  "paneer",
  "lentil",
  "lentils",
  "chickpea",
  "chickpeas",
  "chana",
  "beans",
  "black beans",
  "kidney beans",
  "yogurt",
  "tempeh"
];

const vegetableWords = [
  "spinach",
  "broccoli",
  "pepper",
  "peppers",
  "tomato",
  "tomatoes",
  "onion",
  "carrot",
  "carrots",
  "zucchini",
  "cauliflower",
  "cabbage",
  "greens",
  "kale",
  "mushroom",
  "mushrooms",
  "peas",
  "cucumber",
  "lettuce",
  "salad",
  "eggplant",
  "squash",
  "okra",
  "potato",
  "potatoes"
];

const higherCostWords = ["steak", "salmon", "shrimp", "lamb", "saffron", "burrata"];
const lowerCostWords = ["lentil", "lentils", "beans", "chickpea", "chickpeas", "rice", "egg", "eggs", "pasta", "potato"];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function textForMeal(meal: MealIntelligenceInput) {
  return [
    meal.mealName,
    meal.cuisine,
    meal.proteinLevel,
    meal.satietyLevel,
    meal.bloodSugarImpact,
    meal.effortLevel,
    meal.notes,
    meal.ingredientsText,
    meal.instructionsText
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function hasUsefulText(value: string | null | undefined) {
  return Boolean(value && value.trim().length >= 8);
}

function buildEvidence(
  meal: MealIntelligenceInput,
  feedbackSummary: MealFeedbackSummary | null
) {
  const evidence: string[] = [];

  if (hasUsefulText(meal.ingredientsText)) evidence.push("ingredients");
  if (hasUsefulText(meal.instructionsText)) evidence.push("instructions");
  if (
    typeof meal.calories === "number" ||
    typeof meal.proteinG === "number" ||
    typeof meal.fiberG === "number" ||
    typeof meal.qualityScore === "number" ||
    typeof meal.proteinScore === "number" ||
    typeof meal.fiberScore === "number"
  ) {
    evidence.push("nutrition");
  }
  if (feedbackSummary && feedbackSummary.totalEvents > 0) {
    evidence.push("feedback");
  }
  if (
    meal.familyApproved ||
    meal.weeknightFriendly ||
    meal.comfortMeal ||
    hasUsefulText(meal.effortLevel) ||
    hasUsefulText(meal.cuisine)
  ) {
    evidence.push("meal metadata");
  }
  if (hasUsefulText(meal.notes)) evidence.push("saved notes");

  return Array.from(new Set(evidence));
}

function confidenceFromEvidence(evidence: string[]): MealIntelligenceConfidence {
  const coreEvidenceCount = ["ingredients", "instructions", "nutrition", "feedback"].filter(
    (item) => evidence.includes(item)
  ).length;

  if (coreEvidenceCount >= 3) return "high";
  if (coreEvidenceCount >= 1 || evidence.length >= 2) return "medium";
  return "low";
}

function splitIngredientNames(meal: MealIntelligenceInput): string[] {
  const source = meal.ingredientsText ?? meal.notes ?? "";

  return Array.from(
    new Set(
      source
        .split(/\r?\n|,|;/)
        .map((line) =>
          line
            .replace(/^\s*[-*]\s*/, "")
            .replace(/^\d+(\.\d+)?\s*/, "")
            .replace(/\b(cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|g|kg|ml|l|oz|lb|lbs|can|cans|clove|cloves)\b/gi, "")
            .replace(/\([^)]*\)/g, "")
            .trim()
            .toLowerCase()
        )
        .filter((line) => line.length >= 3)
        .map((line) => line.split(/\s+/).slice(-3).join(" "))
    )
  ).slice(0, 40);
}

function countMatches(text: string, words: string[]) {
  return words.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text)).length;
}

function suitability(score: number): MealIntelligenceSuitability {
  if (score >= 78) return "excellent";
  if (score >= 58) return "good";
  if (score >= 38) return "fair";
  return "poor";
}

function levelFromScore(score: number): MealIntelligenceLevel {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function complexityFromEffort(effort: string | null | undefined, text: string) {
  const effortText = normalizeText(effort);

  if (/high|involved|hard|complex/.test(effortText)) return "high";
  if (/low|easy|quick/.test(effortText)) return "low";

  const instructionCount = text.split(/\b(step|minute|minutes|simmer|bake|roast|marinate)\b/i).length - 1;
  if (instructionCount >= 7 || /marinate|overnight|separate batch|multiple pans/.test(text)) {
    return "high";
  }
  if (instructionCount <= 2 && /sheet pan|one pot|one-pan|quick|simple/.test(text)) {
    return "low";
  }

  return "medium";
}

function activeTime(meal: MealIntelligenceInput, complexity: MealIntelligenceLevel) {
  const text = textForMeal(meal);
  const explicitMinutes = Array.from(text.matchAll(/(\d{1,3})\s*(?:-|to)?\s*(?:\d{1,3})?\s*(?:min|minute|minutes)/g))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 240);

  if (explicitMinutes.length > 0) {
    return Math.max(10, Math.min(90, Math.round(Math.max(...explicitMinutes) * 0.7)));
  }

  if (meal.weeknightFriendly) return 25;
  if (complexity === "low") return 20;
  if (complexity === "high") return 55;
  return 35;
}

function cookingMethod(text: string) {
  const methods: Array<[string, RegExp]> = [
    ["slow cooker", /slow cooker|crockpot/],
    ["instant pot", /instant pot|pressure cook/],
    ["grilled", /grill|grilled/],
    ["roasted", /roast|roasted|bake|baked/],
    ["sheet pan", /sheet pan|sheet-pan/],
    ["stir-fried", /stir fry|stir-fry|wok/],
    ["simmered", /simmer|stew|braise|curry/],
    ["one-pot", /one pot|one-pot/],
    ["assembled", /salad|wrap|sandwich|bowl/]
  ];

  return methods.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function primaryProtein(text: string) {
  return proteinWords.find((protein) => new RegExp(`\\b${protein}\\b`, "i").test(text)) ?? null;
}

function spiceLevel(text: string): MealSpiceLevel {
  if (/ghost pepper|habanero|very spicy|extra spicy|hot chili|hot chilli/.test(text)) return "hot";
  if (/spicy|chili|chilli|jalapeno|harissa|gochujang|sichuan|curry/.test(text)) return "medium";
  if (/mild|kid friendly|kid-friendly/.test(text)) return "mild";
  return "unknown";
}

function dietaryTags(meal: MealIntelligenceInput, text: string, protein: string | null) {
  const tags = new Set<string>();

  if (protein && ["tofu", "tempeh", "lentil", "lentils", "chickpea", "chickpeas", "beans", "black beans", "kidney beans"].includes(protein)) {
    tags.add("plant-forward");
  }
  if (!/(chicken|beef|pork|turkey|lamb|fish|salmon|tuna|shrimp)/.test(text)) {
    tags.add("meatless");
  }
  if (/(paneer|cheese|yogurt|milk|cream|butter)/.test(text)) {
    tags.add("contains dairy");
  }
  if (/(rice|quinoa|potato|corn|oat)/.test(text) && !/(wheat|pasta|noodle|bread|naan|roti|flour)/.test(text)) {
    tags.add("gluten-light");
  }
  if (typeof meal.proteinG === "number" && meal.proteinG >= 25) {
    tags.add("high protein");
  }
  if (typeof meal.fiberG === "number" && meal.fiberG >= 8) {
    tags.add("high fiber");
  }

  return Array.from(tags).slice(0, 6);
}

function nutritionHighlights(meal: MealIntelligenceInput, vegetableDensity: MealIntelligenceLevel) {
  const highlights: string[] = [];

  if (typeof meal.proteinG === "number") highlights.push(`${Math.round(meal.proteinG)} g protein`);
  if (typeof meal.fiberG === "number") highlights.push(`${Math.round(meal.fiberG)} g fiber`);
  if (typeof meal.qualityScore === "number" && meal.qualityScore >= 80) highlights.push("strong quality score");
  if (vegetableDensity === "high") highlights.push("vegetable-forward");
  if (meal.bloodSugarImpact && /low|moderate/i.test(meal.bloodSugarImpact)) {
    highlights.push(`${meal.bloodSugarImpact.toLowerCase()} blood-sugar impact`);
  }

  return highlights.slice(0, 4);
}

function seasonalSuitability(text: string, method: string | null) {
  const seasons = new Set<string>();

  if (/(soup|stew|curry|roast|casserole|braise)/.test(text) || method === "roasted" || method === "simmered") {
    seasons.add("fall");
    seasons.add("winter");
  }
  if (/(salad|grill|grilled|fresh|cucumber|tomato|zucchini|corn)/.test(text)) {
    seasons.add("spring");
    seasons.add("summer");
  }
  if (seasons.size === 0) {
    seasons.add("year-round");
  }

  return Array.from(seasons);
}

function estimateCost(text: string, protein: string | null): MealIntelligenceLevel {
  let score = 45;

  score += countMatches(text, higherCostWords) * 25;
  score -= countMatches(text, lowerCostWords) * 12;
  if (protein && ["beef", "salmon", "shrimp", "lamb"].includes(protein)) score += 18;
  if (protein && ["lentil", "lentils", "beans", "chickpeas", "egg", "eggs"].includes(protein)) score -= 15;

  return levelFromScore(clamp(score));
}

function buildOverlap(meal: MealIntelligenceInput, corpus: MealIntelligenceInput[]) {
  const ingredients = new Set(splitIngredientNames(meal));

  if (ingredients.size === 0) return [];

  return corpus
    .filter((candidate) => candidate.id !== meal.id)
    .map((candidate) => {
      const sharedIngredients = splitIngredientNames(candidate).filter((ingredient) =>
        ingredients.has(ingredient)
      );
      return {
        mealId: candidate.id,
        mealName: candidate.mealName,
        sharedIngredients,
        score: sharedIngredients.length
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.mealName.localeCompare(right.mealName))
    .slice(0, 5);
}

function buildSimilarMeals(
  meal: MealIntelligenceInput,
  corpus: MealIntelligenceInput[],
  overlap: IngredientOverlap[],
  method: string | null,
  protein: string | null
) {
  const overlapById = new Map(overlap.map((entry) => [entry.mealId, entry]));

  return corpus
    .filter((candidate) => candidate.id !== meal.id)
    .map((candidate) => {
      const reasons: string[] = [];
      let score = 0;
      const candidateText = textForMeal(candidate);

      if (meal.cuisine && candidate.cuisine && meal.cuisine.toLowerCase() === candidate.cuisine.toLowerCase()) {
        score += 24;
        reasons.push(`same cuisine (${meal.cuisine})`);
      }
      if (protein && candidateText.includes(protein)) {
        score += 18;
        reasons.push(`same protein (${protein})`);
      }
      if (method && candidateText.includes(method.split(" ")[0])) {
        score += 12;
        reasons.push(`similar method (${method})`);
      }
      const shared = overlapById.get(candidate.id);
      if (shared) {
        score += Math.min(24, shared.score * 6);
        reasons.push(`${shared.score} shared ingredients`);
      }

      return { mealId: candidate.id, mealName: candidate.mealName, reasons, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.mealName.localeCompare(right.mealName))
    .slice(0, 5);
}

export function buildMealIntelligence(
  meal: MealIntelligenceInput,
  corpus: MealIntelligenceInput[] = [],
  feedbackSummary: MealFeedbackSummary | null = null
): MealIntelligence {
  const evidence = buildEvidence(meal, feedbackSummary);
  const confidence = confidenceFromEvidence(evidence);
  const text = textForMeal(meal);
  const preparationComplexity = complexityFromEffort(meal.effortLevel, text);
  const activeCookingTimeMinutes = activeTime(meal, preparationComplexity);
  const method = cookingMethod(text);
  const protein = primaryProtein(text);
  const vegetableCount = countMatches(text, vegetableWords);
  const vegetableDensity = levelFromScore(clamp(vegetableCount * 22));
  const proteinDensity =
    typeof meal.proteinG === "number" && typeof meal.calories === "number" && meal.calories > 0
      ? Math.round((meal.proteinG / meal.calories) * 1000) / 10
      : null;
  const cleanupEffort =
    /sheet pan|one pot|one-pot|instant pot/.test(text)
      ? "low"
      : /fry|fried|breaded|sear|multiple pans|batter/.test(text)
        ? "high"
        : preparationComplexity;
  const spice = spiceLevel(text);
  const cost = estimateCost(text, protein);
  const leftoverScore = clamp(
    55 +
      (/(soup|stew|curry|casserole|chili|lasagna|braise|dal|beans)/.test(text) ? 25 : 0) -
      (/(salad|fried|crispy|toast|taco shell)/.test(text) ? 18 : 0)
  );
  const freezerScore = clamp(
    leftoverScore +
      (/(soup|stew|curry|casserole|chili|sauce)/.test(text) ? 15 : 0) -
      (/(salad|cucumber|lettuce|yogurt|cream sauce|fried)/.test(text) ? 25 : 0)
  );
  const mealPrepScore = clamp(leftoverScore + (activeCookingTimeMinutes <= 35 ? 8 : -8));
  const weeknightScore = clamp(
    45 +
      (meal.weeknightFriendly ? 28 : 0) +
      (activeCookingTimeMinutes <= 35 ? 16 : -12) -
      (preparationComplexity === "high" ? 18 : 0) -
      (cleanupEffort === "high" ? 8 : 0)
  );
  const specialScore = clamp(
    35 +
      (meal.comfortMeal ? 14 : 0) +
      (preparationComplexity === "high" ? 14 : 0) +
      (cost === "high" ? 12 : 0) +
      (typeof meal.qualityScore === "number" && meal.qualityScore >= 85 ? 10 : 0)
  );
  const familyScore = clamp(
    45 +
      (meal.familyApproved ? 30 : 0) +
      (feedbackSummary?.lovedCount ? 12 : 0) -
      (feedbackSummary?.dislikedCount ? 10 : 0) +
      (spice === "hot" ? -20 : spice === "medium" ? -6 : 0)
  );
  const kidScore = clamp(
    familyScore +
      (spice === "mild" ? 12 : 0) -
      (spice === "hot" ? 22 : 0) -
      (/bitter|very spicy|shellfish/.test(text) ? 10 : 0)
  );
  const nutritionScore = clamp(
    (meal.qualityScore ?? 45) * 0.45 +
      (meal.proteinScore ?? (proteinDensity !== null ? proteinDensity * 8 : 35)) * 0.25 +
      (meal.fiberScore ?? (typeof meal.fiberG === "number" ? meal.fiberG * 6 : 30)) * 0.2 +
      (vegetableDensity === "high" ? 10 : vegetableDensity === "medium" ? 5 : 0)
  );
  const overlap = buildOverlap(meal, corpus);

  return {
    confidence,
    evidence,
    preparationComplexity,
    activeCookingTimeMinutes,
    cleanupEffort,
    freezerSuitability: suitability(freezerScore),
    leftoverQuality: suitability(leftoverScore),
    mealPrepSuitability: suitability(mealPrepScore),
    weeknightSuitability: suitability(weeknightScore),
    specialOccasionSuitability: suitability(specialScore),
    familyFriendliness: suitability(familyScore),
    kidFriendliness: suitability(kidScore),
    nutritionHighlights: nutritionHighlights(meal, vegetableDensity),
    proteinDensity,
    vegetableDensity,
    cuisine: meal.cuisine,
    cookingMethod: method,
    primaryProtein: protein,
    spiceLevel: spice,
    dietaryTags: dietaryTags(meal, text, protein),
    seasonalSuitability: seasonalSuitability(text, method),
    estimatedCost: cost,
    ingredientOverlap: overlap,
    similarMeals: buildSimilarMeals(meal, corpus, overlap, method, protein),
    recommendationSignals: {
      convenience: weeknightScore,
      nutrition: nutritionScore,
      family: familyScore,
      variety: clamp(70 - (overlap[0]?.score ?? 0)),
      fit: clamp((weeknightScore + nutritionScore + familyScore) / 3)
    }
  };
}
