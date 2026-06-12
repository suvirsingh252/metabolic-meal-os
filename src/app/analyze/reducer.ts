import type { MealAnalysisResult } from "@/src/lib/types/meal";
import type { MealOptimizationResult } from "@/src/lib/ai/meal-optimization/v1/types";
import type {
  AnalyzeState,
  EditableArrayField,
  EditableBooleanField,
  EditableScoreField,
  EditableTextField,
  IngredientPersistenceStatus,
  OptimizationType,
  SaveMealResponse
} from "@/src/app/analyze/types";

export const initialAnalyzeState: AnalyzeState = {
  recipeText: "",
  analysis: null,
  ingredientText: "",
  mainConcernsText: "",
  shoppingAdditionsText: "",
  prepNotesText: "",
  mealPairingsText: "",
  cautionsText: "",
  evidenceNotesText: "",
  confidenceNotesText: "",
  guidanceBasisText: "",
  error: null,
  saveError: null,
  savedMeal: null,
  ingredientPersistence: { state: "idle" },
  isLoading: false,
  isSaving: false,
  optimizations: {}
};

type AnalyzeAction =
  | { type: "recipeTextChanged"; value: string }
  | { type: "analysisStarted" }
  | { type: "analysisFailed"; message: string }
  | { type: "analysisSucceeded"; analysis: MealAnalysisResult }
  | { type: "textFieldChanged"; field: EditableTextField; value: string }
  | { type: "booleanFieldChanged"; field: EditableBooleanField; checked: boolean }
  | { type: "scoreChanged"; field: EditableScoreField; value: number }
  | { type: "arrayFieldChanged"; field: EditableArrayField; value: string }
  | { type: "ingredientSuggestionsChanged"; value: string }
  | { type: "guidanceBasisChanged"; value: string }
  | { type: "analysisReplaced"; analysis: MealAnalysisResult }
  | { type: "saveStarted" }
  | { type: "saveFailed"; message: string }
  | { type: "saveSucceeded"; savedMeal: SaveMealResponse }
  | { type: "saveFinished" }
  | { type: "ingredientPersistenceChanged"; status: IngredientPersistenceStatus }
  | { type: "saveStatusCleared" }
  | { type: "optimizationStarted"; optimizationType: OptimizationType }
  | { type: "optimizationSucceeded"; optimizationType: OptimizationType; result: MealOptimizationResult }
  | { type: "optimizationFailed"; optimizationType: OptimizationType };

function clearSaveState(state: AnalyzeState): AnalyzeState {
  return {
    ...state,
    saveError: null,
    savedMeal: null,
    ingredientPersistence: { state: "idle" }
  };
}

function textStateKeyForField(field: EditableArrayField) {
  return `${field}Text` as keyof Pick<
    AnalyzeState,
    | "mainConcernsText"
    | "shoppingAdditionsText"
    | "prepNotesText"
    | "mealPairingsText"
    | "cautionsText"
    | "evidenceNotesText"
    | "confidenceNotesText"
  >;
}

export function analyzeReducer(
  state: AnalyzeState,
  action: AnalyzeAction
): AnalyzeState {
  switch (action.type) {
    case "recipeTextChanged":
      return { ...state, recipeText: action.value };
    case "analysisStarted":
      return {
        ...state,
        isLoading: true,
        error: null,
        saveError: null,
        savedMeal: null,
        ingredientPersistence: { state: "idle" },
        optimizations: {}
      };
    case "analysisFailed":
      return { ...state, isLoading: false, error: action.message };
    case "analysisSucceeded":
      return {
        ...state,
        isLoading: false,
        analysis: action.analysis,
        ingredientText: action.analysis.ingredientSuggestions.join("\n"),
        mainConcernsText: action.analysis.mainConcerns.join("\n"),
        shoppingAdditionsText: action.analysis.shoppingAdditions.join("\n"),
        prepNotesText: action.analysis.prepNotes.join("\n"),
        mealPairingsText: action.analysis.mealPairings.join("\n"),
        cautionsText: action.analysis.cautions.join("\n"),
        evidenceNotesText: action.analysis.evidenceNotes.join("\n"),
        confidenceNotesText: action.analysis.confidenceNotes.join("\n"),
        guidanceBasisText: formatGuidanceBasis(action.analysis.guidanceBasis)
      };
    case "textFieldChanged":
      return state.analysis
        ? {
            ...clearSaveState(state),
            analysis: { ...state.analysis, [action.field]: action.value }
          }
        : state;
    case "booleanFieldChanged":
      return state.analysis
        ? {
            ...clearSaveState(state),
            analysis: { ...state.analysis, [action.field]: action.checked }
          }
        : state;
    case "scoreChanged":
      return state.analysis
        ? {
            ...clearSaveState(state),
            analysis: {
              ...state.analysis,
              [action.field]: Math.min(10, Math.max(1, action.value))
            }
          }
        : state;
    case "arrayFieldChanged":
      return state.analysis
        ? {
            ...clearSaveState(state),
            [textStateKeyForField(action.field)]: action.value,
            analysis: {
              ...state.analysis,
              [action.field]: splitLines(action.value)
            }
          }
        : state;
    case "ingredientSuggestionsChanged":
      return state.analysis
        ? {
            ...clearSaveState(state),
            ingredientText: action.value,
            analysis: {
              ...state.analysis,
              ingredientSuggestions: splitLines(action.value)
            }
          }
        : state;
    case "guidanceBasisChanged":
      return state.analysis
        ? {
            ...clearSaveState(state),
            guidanceBasisText: action.value,
            analysis: {
              ...state.analysis,
              guidanceBasis: parseGuidanceBasis(action.value)
            }
          }
        : state;
    case "analysisReplaced":
      return {
        ...clearSaveState(state),
        analysis: action.analysis
      };
    case "saveStarted":
      return { ...state, isSaving: true, saveError: null, savedMeal: null };
    case "saveFailed":
      return { ...state, saveError: action.message };
    case "saveSucceeded":
      return { ...state, savedMeal: action.savedMeal };
    case "saveFinished":
      return { ...state, isSaving: false };
    case "ingredientPersistenceChanged":
      return { ...state, ingredientPersistence: action.status };
    case "saveStatusCleared":
      return clearSaveState(state);
    case "optimizationStarted":
      return {
        ...state,
        optimizations: {
          ...state.optimizations,
          [action.optimizationType]: { status: "loading" }
        }
      };
    case "optimizationSucceeded":
      return {
        ...state,
        optimizations: {
          ...state.optimizations,
          [action.optimizationType]: { status: "success", result: action.result }
        }
      };
    case "optimizationFailed":
      return {
        ...state,
        optimizations: {
          ...state.optimizations,
          [action.optimizationType]: { status: "error" }
        }
      };
    default:
      return state;
  }
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatGuidanceBasis(
  guidanceBasis: MealAnalysisResult["guidanceBasis"]
) {
  return guidanceBasis
    .map(
      (basis) =>
        `${basis.sourceId} | ${basis.principleId} | ${basis.relevance}`
    )
    .join("\n");
}

export function parseGuidanceBasis(
  value: string
): MealAnalysisResult["guidanceBasis"] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sourceId = "", principleId = "", ...relevanceParts] = line
        .split("|")
        .map((part) => part.trim());

      return {
        sourceId,
        principleId,
        relevance: relevanceParts.join(" | ")
      };
    })
    .filter(
      (basis) =>
        basis.sourceId.length > 0 &&
        basis.principleId.length > 0 &&
        basis.relevance.length > 0
    );
}

export function normalizeIngredientSuggestionText(
  text: string,
  fallback: unknown
): string[] {
  const textIngredients = splitLines(text);

  if (textIngredients.length > 0) {
    return textIngredients;
  }

  if (!Array.isArray(fallback)) {
    return [];
  }

  return fallback
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
