import { ArrowRight, ClipboardCheck, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workflowSteps = [
  {
    title: "Paste recipes",
    description: "Capture raw recipe text, notes, and household constraints."
  },
  {
    title: "Review optimization",
    description: "Compare metabolic goals, substitutions, and prep tradeoffs."
  },
  {
    title: "Save to Notion",
    description: "Store clean meal records once the structured result is approved."
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="MVP dashboard"
        title="Metabolic Meal OS"
        description="A focused workspace for turning household recipes into reviewed, structured meal records."
        action={
          <Button asChild>
            <Link href="/analyze">
              Analyze recipe
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Sparkles}
          label="Analysis pipeline"
          value="Draft"
          helper="OpenAI integration placeholder"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Review queue"
          value="0"
          helper="No recipes analyzed yet"
        />
        <StatCard
          icon={Database}
          label="Storage"
          value="Notion"
          helper="API wiring comes next"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Core workflow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <div
              className="rounded-md border bg-background p-4"
              key={step.title}
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </div>
              <h2 className="font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
