import { PageHeader } from "@/components/page-header";
import { GroceryClient } from "@/src/app/grocery/grocery-client";

export default async function GroceryPage({
  searchParams
}: {
  searchParams: Promise<{ meal?: string }>;
}) {
  const { meal } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Grocery Engine"
        title="Grocery list"
        description="Turn saved meals into a categorized shopping checklist."
      />
      <GroceryClient preselectedMealId={meal ?? null} />
    </div>
  );
}
