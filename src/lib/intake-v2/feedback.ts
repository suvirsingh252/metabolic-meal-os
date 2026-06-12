import type { IntakeFeedbackEvent } from "@/src/lib/intake-v2/types";

export function createIntakeFeedbackEvent(
  event: Omit<IntakeFeedbackEvent, "occurredAt">,
  now = new Date()
): IntakeFeedbackEvent {
  return {
    ...event,
    occurredAt: now.toISOString()
  };
}
