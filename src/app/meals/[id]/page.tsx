import Link from "next/link";
import type React from "react";
import { Brain, CalendarDays, ExternalLink, Soup, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FamilyAdjustmentsEditor } from "@/src/app/meals/[id]/family-adjustments-editor";
import { MealDetailActions } from "@/src/app/meals/[id]/meal-detail-actions";
import { formatCookbookIngredientAmount } from "@/src/lib/domain/meals/cookbook";
import { formatPlannerContextLabel } from "@/src/lib/domain/planner";
import { getMealDetail } from "@/src/lib/notion/meal-detail";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import { getWeeklyDinnerPlanner } from "@/src/lib/notion/meal-plan";
import { getSafeHttpUrl } from "@/src/lib/security/source-url";

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

function SummaryItem({
  label,
  value
}: {
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function SectionTitle({
  children,
  icon
}: {
  children: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-2xl font-semibold tracking-normal text-primary">
        {children}
      </h2>
    </div>
  );
}

function MealDetailHero({
  badges,
  description,
  imageUrl,
  title
}: {
  badges: React.ReactNode;
  description: string;
  imageUrl: string | null;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-primary text-primary-foreground shadow-sm">
      <div className="grid min-h-[22rem] md:grid-cols-[minmax(0,1fr)_22rem] lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex flex-col justify-end gap-6 p-6 sm:p-8 lg:p-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-accent">Family cookbook</p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-primary-foreground/80">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">{badges}</div>
        </div>
        <div className="relative min-h-56 bg-accent/90 md:min-h-full">
          {imageUrl ? (
            <div
              aria-hidden
              className="h-full min-h-56 w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className="flex h-full min-h-56 flex-col justify-end bg-[radial-gradient(circle_at_30%_20%,rgba(245,241,232,0.55),transparent_36%),linear-gradient(135deg,rgba(216,139,61,0.95),rgba(139,170,139,0.9))] p-6">
              <div className="rounded-[1.5rem] bg-background/90 p-5 text-primary shadow-sm">
                <p className="text-sm font-semibold text-accent">
                  Ready for tonight
                </p>
                <p className="mt-2 text-2xl font-semibold leading-tight">
                  Cook from the version your household actually repeats.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
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

  const [detailResult, plannerResult] = await Promise.allSettled([
    getMealDetail(id),
    getWeeklyDinnerPlanner()
  ]);

  const detail = detailResult.status === "fulfilled" ? detailResult.value : null;
  if (detailResult.status === "rejected") {
    console.error("Meal detail page failure", detailResult.reason);
  }

  const plannerViewModel =
    plannerResult.status === "fulfilled" && plannerResult.value.setup.ok
      ? plannerResult.value
      : null;
  const plannedSlot = plannerViewModel?.slots.find((s) => s.meal?.id === id) ?? null;

  if (!detail) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Meal detail"
          title="Meal not found"
          description="This saved meal could not be found in the current Hearth meal archive."
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
              currently loaded by Hearth.
            </EmptyText>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { meal, feedbackSummary } = detail;
  const dateLabel = formatDate(detail.dateLabel);
  const { cookbook } = detail;
  const safeOriginalRecipeUrl = getSafeHttpUrl(cookbook.originalRecipeUrl);
  const heroImageUrl =
    (meal as MealSummary & { imageUrl?: string | null }).imageUrl ?? null;
  const heroBadges = (
    <>
      {meal.cuisine ? <Badge>{meal.cuisine}</Badge> : null}
      {meal.mealType ? <Badge>{meal.mealType}</Badge> : null}
      {dateLabel ? (
        <Badge className="bg-background/15 text-primary-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {feedbackSummary.lastEatenAt ? "Last eaten" : "Saved"} {dateLabel}
        </Badge>
      ) : null}
      {plannerViewModel ? (
        <Badge className="bg-background/15 text-primary-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {plannedSlot
            ? formatPlannerContextLabel(plannedSlot, plannerViewModel.days)
            : "Not planned this week"}
        </Badge>
      ) : null}
    </>
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <MealDetailHero
        badges={heroBadges}
        description="Cook the family version, keep the original nearby, and remember what worked."
        imageUrl={heroImageUrl}
        title={meal.mealName}
      />

      <MealDetailActions
        initialFeedbackSummary={feedbackSummary}
        key={[
          meal.id,
          feedbackSummary.totalEvents,
          feedbackSummary.lastEatenAt ?? "never"
        ].join(":")}
        meal={meal}
      />

      {detail.mealOsSummary.hasContent ? (
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" />
              Hearth summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <SummaryItem
              label="Quick verdict"
              value={detail.mealOsSummary.quickVerdict}
            />
            <SummaryItem
              label="Why it works"
              value={detail.mealOsSummary.whyItWorks}
            />
            <SummaryItem
              label="Smallest helpful change"
              value={detail.mealOsSummary.optimization}
            />
            <SummaryItem
              label="Family consideration"
              value={detail.mealOsSummary.familyConsideration}
            />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nutrition confidence
              </p>
              <Badge className="bg-background text-foreground">
                {detail.mealOsSummary.nutritionConfidence}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              How we make it <Star className="h-4 w-4 fill-current text-accent" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cookbook.familyAdjustments.length > 0 ? (
            <ul className="space-y-3">
              {cookbook.familyAdjustments.map((adjustment) => (
                <li
                  className="rounded-2xl bg-background/70 p-4 text-base leading-7"
                  key={adjustment.id}
                >
                  {adjustment.text}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyText>
              No family adjustments have been saved yet. Add the version your
              household actually makes so it is ready next time.
            </EmptyText>
          )}
          <FamilyAdjustmentsEditor meal={meal} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionTitle icon={<Soup className="h-6 w-6 text-accent" />}>Ingredients</SectionTitle>
        {cookbook.ingredients.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cookbook.ingredients.map((ingredient) => {
              const amount = formatCookbookIngredientAmount(ingredient);
              const hasOnlyBareName =
                ingredient.rawText.trim().toLowerCase() ===
                ingredient.name.trim().toLowerCase();

              return (
                <div
                  className="min-h-28 rounded-2xl bg-card p-4 text-base leading-6 shadow-sm"
                  key={ingredient.id}
                >
                  <p className="text-sm font-semibold text-accent">
                    {amount || (hasOnlyBareName ? "As needed" : "")}
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-snug" title={ingredient.rawText}>
                    {ingredient.name}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-5">
            <EmptyText>
              Structured ingredients are not saved for this older meal yet.
              Keep using the original recipe link below; future saves preserve
              ingredient name, quantity, and unit for grocery planning.
            </EmptyText>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>Instructions</SectionTitle>
        {cookbook.instructions.length > 0 ? (
          <ol className="space-y-3">
            {cookbook.instructions.map((step, index) => (
              <li
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-2xl bg-card p-5 text-lg leading-8 shadow-sm"
                key={step.id}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl bg-card p-5">
            <EmptyText>
              Cooking steps are not saved for this older meal yet. The original
              recipe remains available below.
            </EmptyText>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SectionTitle>Original recipe</SectionTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keep the source nearby while the family version stays clean.
            </p>
          </div>
          <Button asChild variant="secondary">
            <a
              href={safeOriginalRecipeUrl ?? meal.url}
              rel="noreferrer"
              target="_blank"
            >
              {safeOriginalRecipeUrl
                ? cookbook.originalRecipeLabel
                : "Open saved record"}{" "}
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <details className="rounded-md border bg-card p-4">
        <summary className="cursor-pointer font-medium">Nutrition</summary>
        <div className="mt-4 space-y-4 border-t pt-4">
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
        </div>
      </details>

      <details className="rounded-md border bg-card p-4">
        <summary className="cursor-pointer font-medium">Advanced details</summary>
        <div className="mt-4 space-y-5 border-t pt-4">
          <section className="grid gap-3 text-sm md:grid-cols-3">
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
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Why this meal</h3>
              {detail.whyReasons.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.whyReasons.map((reason) => (
                    <Badge key={reason}>{reason}</Badge>
                  ))}
                </div>
              ) : (
                <EmptyText>
                  Hearth has limited recommendation context for this meal so far.
                </EmptyText>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">What we know</h3>
              <div className="flex flex-wrap gap-2">
                {meal.proteinLevel ? <Badge>{meal.proteinLevel} protein</Badge> : null}
                {meal.satietyLevel ? <Badge>{meal.satietyLevel} satiety</Badge> : null}
                {meal.bloodSugarImpact ? (
                  <Badge>{meal.bloodSugarImpact} blood sugar impact</Badge>
                ) : null}
                {meal.effortLevel ? <Badge>{meal.effortLevel} effort</Badge> : null}
              </div>
              {detail.feedbackReasons.length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {detail.feedbackReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : (
                <EmptyText>No feedback-derived reasons are available yet.</EmptyText>
              )}
            </div>
          </section>
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
