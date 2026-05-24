import type { IntegrationAdapterStatus } from "@/src/lib/integrations/shared";

export interface WeatherContextRequest {
  city: string;
  province: "NS";
  country: "CA";
  date: string;
}

export interface MealPlanningWeatherContext {
  temperatureUnit: "C";
  summary?: string;
  highTemperature?: number | null;
  lowTemperature?: number | null;
  planningNotes?: string[];
}

export interface WeatherAdapter {
  status(): IntegrationAdapterStatus;
  getMealPlanningContext(
    request: WeatherContextRequest
  ): Promise<MealPlanningWeatherContext | null>;
}

export const weatherAdapterStatus: IntegrationAdapterStatus = {
  name: "weather",
  enabled: false,
  reason: "Stub only. Future contextual planning should enter through this adapter."
};
