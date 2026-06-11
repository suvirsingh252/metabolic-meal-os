import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MealDetailActions } from "@/src/app/meals/[id]/meal-detail-actions";
import { getMealDetail } from "@/src/lib/notion/meal-detail";

export const runtime = "nodejs";

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatValue(value: number | null, unit: string) {
  if (typeof value !== "number") {
    return "Not logged";
  }

  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;

  return unit === "/100" ? `${rounded}${unit}` : `${rounded} ${unit}`;
}

function EmptyText({ children }: { children: string }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

function cleanPrimaryText(value: string | null) {
  return value
    ?.replace(/\[Truncated for Notion rich_text limit\]/gi, "")
    .trim();
}

export default async function MealDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let detail;

  try {
    detail = await getMealDetail(id);
  } catch (error) {
    console.error("Meal detail page failure", error);
    detail = null;
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Meal detail"
          title="Meal not found"
          description="This saved meal could not be found in the current Meal OS meal archive."
          action={
            <Button asChild variant="secondary">
              <Link href="/meals">Back to meals</Link>
            </Button>
          }
        />
        <Card>
          <CardContent className="p-6">
            <EmptyText>
              The meal may have moved in Notion, or it may be outside the meals
              currently loaded by Meal OS.
            </EmptyText>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { meal, feedbackSummary } = detail;
  const dateLabel = formatDate(detail.dateLabel);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Meal detail"
        title={meal.mealName}
        description="Household feedback, why it works, and nutrition signals for this saved meal."
      />

      <section className="flex flex-wrap gap-2">
        {meal.cuisine ? <Badge>{meal.cuisine}</Badge> : null}
        {meal.mealType ? <Badge>{meal.mealType}</Badge> : null}
        {dateLabel ? (
          <Badge className="bg-muted text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {feedbackSummary.lastEatenAt ? "Last eaten" : "Saved"} {dateLabel}
          </Badge>
        ) : null}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Household summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md border bg-background p-4">
            <p className="text-muted-foreground">Meal type</p>
            <p className="mt-1 font-medium">
              {[meal.mealType, meal.cuisine].filter(Boolean).join(" · ") ||
                "Not labeled yet"}
            </p>
          </div>
          <div className="rounded-md border bg-background p-4">
            <p className="text-muted-foreground">Household feedback</p>
            <p className="mt-1 font-medium">
              {feedbackSummary.totalEvents > 0
                ? `${feedbackSummary.eatenCount} eaten · ${feedbackSummary.wouldRepeatCount} repeat`
                : "No feedback yet"}
            </p>
          </div>
          <div className="rounded-md border bg-background p-4">
            <p className="text-muted-foreground">Nutrition / quality</p>
            <p className="mt-1 font-medium">
              {detail.hasNutritionData
                ? "Nutrition signals available"
                : "Nutrition details limited"}
            </p>
          </div>
        </CardContent>
      </Card>

      <MealDetailActions
        initialFeedbackSummary={feedbackSummary}
        key={[
          meal.id,
          feedbackSummary.totalEvents,
          feedbackSummary.lastEatenAt ?? "never"
        ].join(":")}
        meal={meal}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why this meal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.whyReasons.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detail.whyReasons.map((reason) => (
                  <Badge key={reason}>{reason}</Badge>
                ))}
              </div>
            ) : (
              <EmptyText>
                Meal OS has limited recommendation context for this meal so far.
              </EmptyText>
            )}

            {detail.feedbackReasons.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Household signals</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {detail.feedbackReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyText>No feedback-derived reasons are available yet.</EmptyText>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What we know</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {meal.proteinLevel ? <Badge>{meal.proteinLevel} protein</Badge> : null}
              {meal.satietyLevel ? <Badge>{meal.satietyLevel} satiety</Badge> : null}
              {meal.bloodSugarImpact ? (
                <Badge>{meal.bloodSugarImpact} blood sugar impact</Badge>
              ) : null}
              {meal.effortLevel ? <Badge>{meal.effortLevel} effort</Badge> : null}
            </div>
            <EmptyText>
              {detail.hasNutritionData
                ? "Meal OS has enough saved context to summarize this meal."
                : "Meal OS has limited saved context for this meal right now."}
            </EmptyText>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Nutrition / quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.hasNutritionData ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {detail.nutritionItems.map((item) => (
                <div className="rounded-md border bg-background p-4" key={item.id}>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatValue(item.value, item.unit)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>Nutrition details have not been saved for this meal yet.</EmptyText>
          )}
        </CardContent>
      </Card>

      <details className="rounded-md border bg-card p-4">
        <summary className="cursor-pointer font-medium">Advanced details</summary>
        <div className="mt-4 space-y-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-2">
            <Badge>{detail.sourceBadge}</Badge>
            {detail.confidenceBadge ? <Badge>{detail.confidenceBadge}</Badge> : null}
          </div>
          {cleanPrimaryText(meal.notes) ? (
            <p className="leading-6">{cleanPrimaryText(meal.notes)}</p>
          ) : (
            <EmptyText>No original notes are saved for this meal.</EmptyText>
          )}
          {detail.nutritionProvenance ? (
            <p className="leading-6">{detail.nutritionProvenance}</p>
          ) : null}
          <a
            className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            href={meal.url}
            rel="noreferrer"
            target="_blank"
          >
            Open saved record
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </details>
    </div>
  );
}
