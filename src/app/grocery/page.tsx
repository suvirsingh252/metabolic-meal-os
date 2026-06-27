import { PageHeader } from "@/components/page-header";
import { GroceryClient } from "@/src/app/grocery/grocery-client";

export default async function GroceryPage({
  searchParams
}: {
  searchParams: Promise<{ meal?: string; list?: string }>;
}) {
  const { meal, list } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shopping"
        title="Shopping list"
        description="Turn saved dinners into a categorized checklist."
      />
      <GroceryClient
        initialListId={list ?? null}
        preselectedMealId={meal ?? null}
      />
    </div>
  );
}
