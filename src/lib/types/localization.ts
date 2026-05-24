export const supportedCountries = ["CA"] as const;
export const supportedProvinces = ["NS"] as const;
export const preferredUnitModes = ["metric", "mixed"] as const;
export const supportedCurrencies = ["CAD"] as const;
export const supportedTemperatureUnits = ["C"] as const;

export type SupportedCountry = (typeof supportedCountries)[number];
export type SupportedProvince = (typeof supportedProvinces)[number];
export type PreferredUnitMode = (typeof preferredUnitModes)[number];
export type SupportedCurrency = (typeof supportedCurrencies)[number];
export type SupportedTemperatureUnit = (typeof supportedTemperatureUnits)[number];

export interface HouseholdPreferences {
  country: SupportedCountry;
  province: SupportedProvince;
  city: string;
  preferredUnits: PreferredUnitMode;
  currency: SupportedCurrency;
  temperatureUnit: SupportedTemperatureUnit;
  preferredStores: string[];
}

export const defaultHouseholdPreferences: HouseholdPreferences = {
  country: "CA",
  province: "NS",
  city: "Halifax",
  preferredUnits: "mixed",
  currency: "CAD",
  temperatureUnit: "C",
  preferredStores: []
};
