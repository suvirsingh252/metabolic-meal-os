import type { IntegrationAdapterStatus } from "@/src/lib/integrations/shared";

export interface GroceryPriceLookup {
  ingredientName: string;
  city?: string;
  province?: "NS";
  country?: "CA";
  preferredStores?: string[];
}

export interface GroceryPriceEstimate {
  ingredientName: string;
  currency: "CAD";
  estimatedPrice?: number | null;
  storeName?: string | null;
  packageSize?: string | null;
  sourceName: string;
  observedAt: string;
}

export interface GroceryPricesAdapter {
  status(): IntegrationAdapterStatus;
  estimatePrice(lookup: GroceryPriceLookup): Promise<GroceryPriceEstimate | null>;
}

export const groceryPricesAdapterStatus: IntegrationAdapterStatus = {
  name: "grocery-prices",
  enabled: false,
  reason: "Stub only. No flyer, scraping, or paid API integration yet."
};
