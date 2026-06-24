export const groceryCategories = [
  "Produce",
  "Protein",
  "Dairy",
  "Bakery",
  "Frozen",
  "Pantry",
  "Spices",
  "Condiments",
  "Beverages",
  "Other"
] as const;

export type GroceryCategory = (typeof groceryCategories)[number];

const exactCategoryByIngredient = new Map<string, GroceryCategory>([
  ["almond milk", "Beverages"],
  ["bagel", "Bakery"],
  ["bread", "Bakery"],
  ["broth", "Pantry"],
  ["butter", "Dairy"],
  ["cheddar cheese", "Dairy"],
  ["chicken breast", "Protein"],
  ["chicken breasts", "Protein"],
  ["chicken thigh", "Protein"],
  ["chicken thighs", "Protein"],
  ["coconut milk", "Pantry"],
  ["cream", "Dairy"],
  ["cream cheese", "Dairy"],
  ["egg", "Protein"],
  ["eggs", "Protein"],
  ["feta cheese", "Dairy"],
  ["flour", "Pantry"],
  ["greek yogurt", "Dairy"],
  ["milk", "Dairy"],
  ["olive oil", "Pantry"],
  ["pasta", "Pantry"],
  ["rice", "Pantry"],
  ["sour cream", "Dairy"],
  ["tortilla", "Bakery"],
  ["tortillas", "Bakery"],
  ["yogurt", "Dairy"]
]);

const categoryRules: Array<{
  category: GroceryCategory;
  pattern: RegExp;
}> = [
  {
    category: "Produce",
    pattern:
      /\b(apple|arugula|asparagus|avocado|banana|basil|bean sprout|beet|bell pepper|bok choy|broccoli|cabbage|carrot|cauliflower|celery|cilantro|corn|cucumber|dill|eggplant|garlic|ginger|grape|green bean|green onion|herb|kale|leek|lemon|lettuce|lime|mushroom|onion|orange|parsley|pepper|potato|radish|scallion|shallot|spinach|squash|sweet potato|tomato|zucchini)\b/
  },
  {
    category: "Protein",
    pattern:
      /\b(bacon|beef|chicken|chickpea|cod|egg|fish|ham|lentil|pork|salmon|sausage|shrimp|steak|tempeh|tofu|tuna|turkey)\b/
  },
  {
    category: "Dairy",
    pattern: /\b(cheese|cream|feta|milk|mozzarella|paneer|parmesan|ricotta|yogurt)\b/
  },
  {
    category: "Bakery",
    pattern: /\b(baguette|bread|bun|naan|pita|roll|sourdough|tortilla|wrap)\b/
  },
  {
    category: "Frozen",
    pattern: /\b(frozen|ice cream)\b/
  },
  {
    category: "Spices",
    pattern:
      /\b(allspice|bay leaf|cardamom|cayenne|chili powder|cinnamon|clove|coriander|cumin|curry powder|garam masala|nutmeg|oregano|paprika|peppercorn|saffron|salt|spice|thyme|turmeric)\b/
  },
  {
    category: "Condiments",
    pattern:
      /\b(chutney|dijon|fish sauce|hot sauce|jam|ketchup|mayo|mayonnaise|mustard|pickle|relish|salsa|soy sauce|sriracha|tamari|vinegar|worcestershire)\b/
  },
  {
    category: "Beverages",
    pattern: /\b(coffee|juice|kombucha|soda|tea|water)\b/
  },
  {
    category: "Pantry",
    pattern:
      /\b(bean|breadcrumb|broth|can|canned|cereal|coconut milk|flour|honey|lentil|maple syrup|noodle|nut|oat|oil|pasta|peanut butter|quinoa|rice|seed|sugar|tomato paste)\b/
  }
];

export function resolveGroceryCategory(ingredientName: string): GroceryCategory {
  const normalized = ingredientName.trim().toLowerCase();

  return (
    exactCategoryByIngredient.get(normalized) ??
    categoryRules.find((rule) => rule.pattern.test(normalized))?.category ??
    "Other"
  );
}
