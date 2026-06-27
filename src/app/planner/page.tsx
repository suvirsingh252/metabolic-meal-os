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
        eyebrow="Planner"
        title="Weekly dinners"
        description="Plan lunches and dinners with saved favorites and a shopping preview."
      />
      <PlannerClient preselectedMealId={meal ?? null} />
    </div>
  );
}
