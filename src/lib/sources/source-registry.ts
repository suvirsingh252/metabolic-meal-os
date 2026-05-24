export const sourceTypes = [
  "nutrient-data",
  "clinical-guideline",
  "public-health-guidance",
  "crowdsourced-food-data"
] as const;

export const sourceConfidenceLevels = ["high", "medium", "low"] as const;

export type SourceType = (typeof sourceTypes)[number];
export type SourceConfidence = (typeof sourceConfidenceLevels)[number];

export interface ApprovedSourceRecord {
  id: string;
  name: string;
  type: SourceType;
  jurisdiction: string;
  url: string;
  confidence: SourceConfidence;
  allowedUses: string[];
  prohibitedUses: string[];
  lastReviewed: string;
}

export const approvedSources = [
  {
    id: "usda-food-data-central",
    name: "USDA FoodData Central",
    type: "nutrient-data",
    jurisdiction: "United States",
    url: "https://fdc.nal.usda.gov/index.html",
    confidence: "high",
    allowedUses: [
      "Reference nutrient composition for foods when Canadian data is unavailable.",
      "Cross-check generic ingredient nutrition estimates.",
      "Support approximate nutrition enrichment with clear source attribution."
    ],
    prohibitedUses: [
      "Do not treat values as Canada-specific grocery or labelling data.",
      "Do not use as a diagnosis, treatment, or individualized medical prescription.",
      "Do not imply exact nutrient values for a household recipe without serving-size review."
    ],
    lastReviewed: "2026-05-24"
  },
  {
    id: "health-canada-canadian-nutrient-file",
    name: "Health Canada / Canadian Nutrient File",
    type: "nutrient-data",
    jurisdiction: "Canada",
    url: "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data.html",
    confidence: "high",
    allowedUses: [
      "Prefer for Canadian nutrient composition context.",
      "Support Canadian grocery and recipe nutrition estimates.",
      "Ground ingredient-level nutrition enrichment for common Canadian foods."
    ],
    prohibitedUses: [
      "Do not use nutrient averages as exact values for a specific branded package.",
      "Do not use as a diagnosis, treatment, or individualized medical prescription.",
      "Do not override product labels or clinician/dietitian guidance."
    ],
    lastReviewed: "2026-05-24"
  },
  {
    id: "diabetes-canada-guidelines",
    name: "Diabetes Canada Clinical Practice Guidelines",
    type: "clinical-guideline",
    jurisdiction: "Canada",
    url: "https://guidelines.diabetes.ca/cpg/chapter11",
    confidence: "high",
    allowedUses: [
      "Support general food-pattern language for diabetes-aware meal analysis.",
      "Frame blood-sugar-supportive suggestions around fibre, protein, carbohydrate quality, and practical eating patterns.",
      "Ground safety limits for non-diagnostic diabetes-related language."
    ],
    prohibitedUses: [
      "Do not diagnose diabetes or prediabetes.",
      "Do not claim to treat, cure, prevent, or reverse diabetes.",
      "Do not provide medication, insulin, or individualized clinical advice.",
      "Do not replace clinician or registered dietitian guidance."
    ],
    lastReviewed: "2026-05-24"
  },
  {
    id: "international-pcos-guideline-2023",
    name: "2023 International Evidence-Based PCOS Guideline",
    type: "clinical-guideline",
    jurisdiction: "International",
    url: "https://www.monash.edu/medicine/mchri/pcos/guideline",
    confidence: "high",
    allowedUses: [
      "Support general PCOS-aware food-pattern language.",
      "Emphasize sustainable lifestyle support, metabolic health, quality of life, and avoidance of weight stigma.",
      "Ground safety limits for non-diagnostic PCOS-related language."
    ],
    prohibitedUses: [
      "Do not diagnose PCOS.",
      "Do not claim to treat, cure, prevent, or reverse PCOS.",
      "Do not provide fertility, medication, supplement, or individualized clinical advice.",
      "Do not replace clinician or registered dietitian guidance."
    ],
    lastReviewed: "2026-05-24"
  },
  {
    id: "canadas-food-guide",
    name: "Canada's Food Guide",
    type: "public-health-guidance",
    jurisdiction: "Canada",
    url: "https://www.canada.ca/en/health-canada/services/food-guide.html",
    confidence: "high",
    allowedUses: [
      "Support Canada-centred healthy eating pattern suggestions.",
      "Frame meal planning around vegetables and fruits, whole grains, protein foods, water, and lower intake of highly processed foods.",
      "Provide general public-health guidance for household meal planning."
    ],
    prohibitedUses: [
      "Do not present public-health guidance as individualized medical nutrition therapy.",
      "Do not use as a diagnosis, treatment, or cure source.",
      "Do not override culturally appropriate eating patterns, allergies, medical needs, or clinician/dietitian advice."
    ],
    lastReviewed: "2026-05-24"
  },
  {
    id: "open-food-facts",
    name: "Open Food Facts",
    type: "crowdsourced-food-data",
    jurisdiction: "Global",
    url: "https://world.openfoodfacts.org/",
    confidence: "low",
    allowedUses: [
      "Look up packaged-food label data by barcode or product name when official data is unavailable.",
      "Support low-confidence packaged-food enrichment with clear attribution.",
      "Flag data gaps or uncertainty for human review."
    ],
    prohibitedUses: [
      "Do not treat crowdsourced values as authoritative without review.",
      "Do not use as the sole source for clinical, diabetes, or PCOS guidance.",
      "Do not overwrite canonical household recipe or product data without confirmation."
    ],
    lastReviewed: "2026-05-24"
  }
] as const satisfies readonly ApprovedSourceRecord[];

export type ApprovedSourceId = (typeof approvedSources)[number]["id"];

export function getApprovedSourceById(id: ApprovedSourceId) {
  return approvedSources.find((source) => source.id === id) ?? null;
}
