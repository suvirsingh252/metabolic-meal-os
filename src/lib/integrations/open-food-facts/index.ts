import type { IntegrationAdapterStatus } from "@/src/lib/integrations/shared";

export interface OpenFoodFactsProductLookup {
  barcode?: string;
  productName?: string;
  countryCode?: "ca";
}

export interface OpenFoodFactsProductSummary {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  categories?: string[];
}

export interface OpenFoodFactsAdapter {
  status(): IntegrationAdapterStatus;
  findProduct(
    lookup: OpenFoodFactsProductLookup
  ): Promise<OpenFoodFactsProductSummary | null>;
}

export const openFoodFactsAdapterStatus: IntegrationAdapterStatus = {
  name: "open-food-facts",
  enabled: false,
  reason: "Stub only. Add API implementation after recipe and grocery schemas settle."
};
