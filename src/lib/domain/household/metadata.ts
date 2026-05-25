export const visibilityOptions = ["private", "household"] as const;

export type RecordVisibility = (typeof visibilityOptions)[number];

export interface HouseholdRecordMetadata {
  householdId: string;
  createdBy: string;
  visibility: RecordVisibility;
  schemaVersion: string;
}

export function getConfiguredHouseholdMetadata(): HouseholdRecordMetadata {
  const configuredVisibility = process.env.APP_RECORD_VISIBILITY?.trim();

  return validateHouseholdMetadata({
    householdId: process.env.APP_HOUSEHOLD_ID?.trim() || "private-household",
    createdBy: process.env.APP_CREATED_BY?.trim() || "private-token",
    visibility:
      configuredVisibility === "household" || configuredVisibility === "private"
        ? configuredVisibility
        : "private",
    schemaVersion: "meal-record-v1"
  });
}

export function validateHouseholdMetadata(
  value: Partial<HouseholdRecordMetadata>
): HouseholdRecordMetadata {
  const householdId = value.householdId?.trim();
  const createdBy = value.createdBy?.trim();
  const visibility = value.visibility;
  const schemaVersion = value.schemaVersion?.trim();

  if (!householdId) {
    throw new Error("householdId is required.");
  }

  if (!createdBy) {
    throw new Error("createdBy is required.");
  }

  if (!visibility || !visibilityOptions.includes(visibility)) {
    throw new Error("visibility must be private or household.");
  }

  if (!schemaVersion) {
    throw new Error("schemaVersion is required.");
  }

  return {
    householdId,
    createdBy,
    visibility,
    schemaVersion
  };
}
