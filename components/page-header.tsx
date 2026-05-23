import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: PageHeaderProps) {
  return (
    <section className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-normal text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
