import type { EnergyAfter, HungerLater } from "@/src/lib/types/feedback";

export interface MealFeedbackEvent {
  mealId: string | null;
  createdAt: string;
  feedbackEntry: string;
  energyAfter: EnergyAfter | null;
  hungerLater: HungerLater | null;
  cravingsLater: boolean | null;
  wouldRepeat: boolean | null;
  notes: string | null;
}

export interface MealFeedbackSummary {
  mealId: string;
  totalEvents: number;
  eatenCount: number;
  lovedCount: number;
  likedCount: number;
  dislikedCount: number;
  wouldRepeatCount: number;
  wouldNotRepeatCount: number;
  lastEatenAt: string | null;
  lastPositiveAt: string | null;
  netPreferenceScore: number;
  confidence: "none" | "low" | "medium" | "high";
  recentNotes: string[];
}

export type MealFeedbackSummaryByMealId = Record<string, MealFeedbackSummary>;

function isPositiveEvent(event: MealFeedbackEvent) {
  return (
    event.wouldRepeat === true ||
    event.energyAfter === "Steady" ||
    event.energyAfter === "Excellent" ||
    event.hungerLater === "Satisfied" ||
    event.hungerLater === "Very Full"
  );
}

function isLovedEvent(event: MealFeedbackEvent) {
  const text = `${event.feedbackEntry} ${event.notes ?? ""}`.toLowerCase();

  return (
    text.includes("loved") ||
    text.includes("loved it") ||
    (event.energyAfter === "Excellent" &&
      event.wouldRepeat === true &&
      event.cravingsLater === false)
  );
}

function isDislikedEvent(event: MealFeedbackEvent) {
  return (
    event.wouldRepeat === false ||
    event.energyAfter === "Crash" ||
    event.hungerLater === "Very Hungry" ||
    event.cravingsLater === true
  );
}

function isRepeatOnlyEvent(event: MealFeedbackEvent) {
  const text = `${event.feedbackEntry} ${event.notes ?? ""}`.toLowerCase();

  return text.includes("would make again from meal detail");
}

function latestDate(left: string | null, right: string) {
  if (!left) {
    return right;
  }

  return right > left ? right : left;
}

function getConfidence(summary: Omit<MealFeedbackSummary, "confidence">) {
  if (summary.totalEvents === 0) {
    return "none";
  }

  if (summary.totalEvents >= 5) {
    return "high";
  }

  if (summary.totalEvents >= 2) {
    return "medium";
  }

  return "low";
}

export function summarizeMealFeedback(
  events: MealFeedbackEvent[]
): MealFeedbackSummaryByMealId {
  const summaries: Record<string, Omit<MealFeedbackSummary, "confidence">> = {};

  for (const event of events) {
    if (!event.mealId) {
      continue;
    }

    const summary =
      summaries[event.mealId] ??
      {
        mealId: event.mealId,
        totalEvents: 0,
        eatenCount: 0,
        lovedCount: 0,
        likedCount: 0,
        dislikedCount: 0,
        wouldRepeatCount: 0,
        wouldNotRepeatCount: 0,
        lastEatenAt: null,
        lastPositiveAt: null,
        netPreferenceScore: 0,
        recentNotes: []
      };
    const loved = isLovedEvent(event);
    const positive = isPositiveEvent(event);
    const disliked = isDislikedEvent(event);
    const repeatOnly = isRepeatOnlyEvent(event);

    summary.totalEvents += 1;
    if (!repeatOnly) {
      summary.eatenCount += 1;
      summary.lastEatenAt = latestDate(summary.lastEatenAt, event.createdAt);
    }

    if (loved) {
      summary.lovedCount += 1;
      summary.netPreferenceScore += 4;
    }

    if (positive && !repeatOnly) {
      summary.likedCount += 1;
      summary.lastPositiveAt = latestDate(summary.lastPositiveAt, event.createdAt);
      summary.netPreferenceScore += 2;
    }

    if (disliked) {
      summary.dislikedCount += 1;
      summary.netPreferenceScore -= 3;
    }

    if (event.wouldRepeat === true) {
      summary.wouldRepeatCount += 1;
      summary.netPreferenceScore += 2;
    } else if (event.wouldRepeat === false) {
      summary.wouldNotRepeatCount += 1;
      summary.netPreferenceScore -= 2;
    }

    if (event.notes?.trim()) {
      summary.recentNotes = [
        ...summary.recentNotes.filter((note) => note !== event.notes?.trim()),
        event.notes.trim()
      ].slice(0, 3);
    }

    summaries[event.mealId] = summary;
  }

  return Object.fromEntries(
    Object.entries(summaries).map(([mealId, summary]) => [
      mealId,
      {
        ...summary,
        confidence: getConfidence(summary)
      }
    ])
  );
}

export function emptyMealFeedbackSummary(
  mealId: string
): MealFeedbackSummary {
  return {
    mealId,
    totalEvents: 0,
    eatenCount: 0,
    lovedCount: 0,
    likedCount: 0,
    dislikedCount: 0,
    wouldRepeatCount: 0,
    wouldNotRepeatCount: 0,
    lastEatenAt: null,
    lastPositiveAt: null,
    netPreferenceScore: 0,
    confidence: "none",
    recentNotes: []
  };
}
