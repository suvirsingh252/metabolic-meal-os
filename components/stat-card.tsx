import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}

export function StatCard({ icon: Icon, label, value, helper }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
