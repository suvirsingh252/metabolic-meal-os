export type PantryItemSource =
  | "manual"
  | "recipe"
  | "grocery-list"
  | "receipt"
  | "integration";

export interface PantryItem {
  name: string;
  normalizedIngredientId?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  expiresAt?: string | null;
  source: PantryItemSource;
}
