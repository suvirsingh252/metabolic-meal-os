import { PageHeader } from "@/components/page-header";
import { PlannerClient } from "@/src/app/planner/planner-client";

export default async function PlannerPage({
  searchParams
}: {
  searchParams: Promise<{ meal?: string }>;
}) {
  const { meal } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Weekly Planner"
        title="Meal plan"
        description="Plan this week's meals from saved meals."
      />
      <PlannerClient preselectedMealId={meal ?? null} />
    </div>
  );
}
