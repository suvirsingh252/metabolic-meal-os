export const mealSlots = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type MealSlot = (typeof mealSlots)[number];

export const plannerStatuses = [
  "Planned",
  "Cooked",
  "Skipped",
  "Swapped"
] as const;
export type PlannerStatus = (typeof plannerStatuses)[number];

export const plannerSources = ["Manual", "Suggested", "Generated"] as const;
export type PlannerSource = (typeof plannerSources)[number];

export interface PlannerDay {
  date: string;
  label: string;
  weekday: string;
}

export interface PlannerSlot {
  id: string;
  planDate: string;
  mealSlot: MealSlot;
  status: PlannerStatus;
  source: PlannerSource | null;
  meal: {
    id: string;
    name: string;
    url: string;
  } | null;
  householdNotes: string | null;
}

export interface PlannerSetupIssue {
  code: "missing-config" | "schema";
  message: string;
}

export interface PlannerViewModel {
  weekStart: string;
  weekEnd: string;
  days: PlannerDay[];
  slots: PlannerSlot[];
  setup: {
    ok: boolean;
    issues: PlannerSetupIssue[];
  };
}

export interface PlannerMutationInput {
  planDate: string;
  slot: MealSlot;
  action: "assign" | "clear" | "status";
  mealId?: string;
  status?: PlannerStatus;
}

export function getPlannerSlotKey(planDate: string, slot: MealSlot) {
  return `${planDate}:${slot}`;
}

export function groupPlannerSlotsByDateAndSlot(slots: PlannerSlot[]) {
  return new Map(
    slots.map((slot) => [
      getPlannerSlotKey(slot.planDate, slot.mealSlot),
      slot
    ])
  );
}

export function isMealSlot(value: unknown): value is MealSlot {
  return typeof value === "string" && mealSlots.includes(value as MealSlot);
}

export function isPlannerStatus(value: unknown): value is PlannerStatus {
  return (
    typeof value === "string" &&
    plannerStatuses.includes(value as PlannerStatus)
  );
}

export function isPlannerSource(value: unknown): value is PlannerSource {
  return (
    typeof value === "string" && plannerSources.includes(value as PlannerSource)
  );
}

export function validatePlanDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Plan date must use YYYY-MM-DD.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  const normalized = date.toISOString().slice(0, 10);

  if (normalized !== value) {
    throw new Error("Plan date must be a real calendar date.");
  }

  return value;
}

export function validateMealId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-fA-F-]{32,36}$/.test(value.trim())
  ) {
    throw new Error("Meal ID must be a valid Notion page ID.");
  }

  return value.trim();
}

export function getCurrentPlannerWeek(today = new Date()): PlannerDay[] {
  const utcDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const day = utcDate.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(utcDate);
  monday.setUTCDate(utcDate.getUTCDate() + offset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const iso = date.toISOString().slice(0, 10);

    return {
      date: iso,
      weekday: date.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC"
      }),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      })
    };
  });
}

export function validatePlannerMutation(value: unknown): PlannerMutationInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Planner request body must be an object.");
  }

  const body = value as Record<string, unknown>;
  const planDate = validatePlanDate(body.planDate);

  if (!isMealSlot(body.slot)) {
    throw new Error("Meal slot must be Dinner, Lunch, Breakfast, or Snack.");
  }

  if (
    body.action !== "assign" &&
    body.action !== "clear" &&
    body.action !== "status"
  ) {
    throw new Error("Planner action must be assign, clear, or status.");
  }

  if (body.action === "assign") {
    return {
      planDate,
      slot: body.slot,
      action: body.action,
      mealId: validateMealId(body.mealId)
    };
  }

  if (body.action === "status") {
    if (!isPlannerStatus(body.status)) {
      throw new Error("Status must be Planned, Cooked, Skipped, or Swapped.");
    }

    return {
      planDate,
      slot: body.slot,
      action: body.action,
      status: body.status
    };
  }

  return {
    planDate,
    slot: body.slot,
    action: body.action
  };
}
