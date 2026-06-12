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
    <section className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between md:gap-4 md:pb-6">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-normal text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal md:mt-2 md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground md:mt-3 md:text-base md:leading-7">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
