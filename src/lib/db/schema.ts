import {
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

// meals is the Postgres mirror of the Notion NOTION_MEALS_DATABASE_ID database.
// notion_page_id and notion_url are kept as long-term sync anchors; they will
// remain even after Notion is demoted from primary to archive.
export const meals = pgTable("meals", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Notion sync anchors
  notionPageId: text("notion_page_id").unique(),
  notionUrl: text("notion_url"),

  // Tenancy — household_id mirrors APP_HOUSEHOLD_ID and is always populated.
  // All query paths must include a WHERE household_id = $householdId clause.
  householdId: text("household_id").notNull(),
  createdBy: text("created_by"),
  visibility: text("visibility"),
  schemaVersion: text("schema_version"),

  // Identity
  mealName: text("meal_name").notNull(),
  cuisine: text("cuisine"),
  mealType: text("meal_type"),
  proteinLevel: text("protein_level"),
  satietyLevel: text("satiety_level"),
  bloodSugarImpact: text("blood_sugar_impact"),
  effortLevel: text("effort_level"),

  // Boolean signals
  familyApproved: boolean("family_approved").notNull().default(false),
  weeknightFriendly: boolean("weeknight_friendly").notNull().default(false),
  comfortMeal: boolean("comfort_meal").notNull().default(false),

  // Source tracking
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  sourceType: text("source_type"),
  sourceClassification: text("source_classification"),
  sourceNotes: text("source_notes"),
  importedAt: timestamp("imported_at", { withTimezone: true }),
  lastParsedAt: timestamp("last_parsed_at", { withTimezone: true }),
  parserVersion: text("parser_version"),
  analysisVersion: text("analysis_version"),
  analysisModel: text("analysis_model"),

  // Recipe content
  ingredientsText: text("ingredients_text"),
  instructionsText: text("instructions_text"),
  optimizedVersion: text("optimized_version"),
  notes: text("notes"),

  // Nutrition
  calories: numeric("calories"),
  proteinG: numeric("protein_g"),
  carbohydratesG: numeric("carbohydrates_g"),
  fatG: numeric("fat_g"),
  fiberG: numeric("fiber_g"),
  sodiumMg: numeric("sodium_mg"),
  sugarG: numeric("sugar_g"),
  nutritionConfidence: text("nutrition_confidence"),
  nutritionSource: text("nutrition_source"),
  nutritionProvenance: text("nutrition_provenance"),

  // Quality scores
  qualityScore: numeric("quality_score"),
  metabolicScore: numeric("metabolic_score"),
  proteinScore: numeric("protein_score"),
  fiberScore: numeric("fiber_score"),
  energyDensityScore: numeric("energy_density_score"),
  processingScore: numeric("processing_score"),
  satietyScoreNumeric: numeric("satiety_score_numeric"),
  bloodSugarRiskScore: numeric("blood_sugar_risk_score"),

  // Date the meal was logged/imported (distinct from row creation time)
  mealDate: date("meal_date"),

  // Row timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;

export const dinnerFeedback = pgTable(
  "dinner_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: text("household_id").notNull(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meals.id),
    chipType: text("chip_type").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    householdMealIdx: index("dinner_feedback_household_meal_idx").on(
      table.householdId,
      table.mealId
    ),
    createdAtIdx: index("dinner_feedback_created_at_idx").on(table.createdAt)
  })
);

export type DinnerFeedback = typeof dinnerFeedback.$inferSelect;
export type NewDinnerFeedback = typeof dinnerFeedback.$inferInsert;
