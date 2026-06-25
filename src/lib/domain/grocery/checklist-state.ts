import type {
  GroceryCategorySection,
  GroceryList
} from "@/src/lib/domain/grocery/grocery-generator";
import type { GroceryCategory } from "@/src/lib/domain/grocery/grocery-categories";

export interface GroceryChecklistSourceItem {
  ingredient: string;
  category: GroceryCategory;
  sortOrder: number;
}

export interface PreviousGroceryChecklistItem {
  ingredient: string;
  completed: boolean;
}

export interface GroceryChecklistItemDraft extends GroceryChecklistSourceItem {
  completed: boolean;
}

export function stableGroceryChecklistKey(value: string) {
  return value.trim().toLowerCase();
}

export function flattenGrocerySections(
  sections: GroceryCategorySection[]
): GroceryChecklistSourceItem[] {
  return sections.flatMap((section, sectionIndex) =>
    section.items.map((item, itemIndex) => ({
      ingredient: item.name,
      category: item.category,
      sortOrder: sectionIndex * 1000 + itemIndex
    }))
  );
}

export function mergeGroceryChecklistState(input: {
  generated: GroceryList;
  previousItems?: PreviousGroceryChecklistItem[];
}): GroceryChecklistItemDraft[] {
  const completedByIngredient = new Map(
    (input.previousItems ?? []).map((item) => [
      stableGroceryChecklistKey(item.ingredient),
      item.completed
    ])
  );

  return flattenGrocerySections(input.generated.sections).map((item) => ({
    ...item,
    completed:
      completedByIngredient.get(stableGroceryChecklistKey(item.ingredient)) ??
      false
  }));
}
