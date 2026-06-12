export const mealOptimizationJsonSchema = {
  type: "object",
  required: ["optimizationType", "headline", "changes", "whyItHelps", "note"],
  additionalProperties: false,
  properties: {
    optimizationType: { type: "string" },
    headline: { type: "string" },
    changes: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3
    },
    whyItHelps: { type: "string" },
    note: { type: "string" }
  }
} as const;
