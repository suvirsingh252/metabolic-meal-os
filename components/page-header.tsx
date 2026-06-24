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
    <section className="flex flex-col gap-4 pb-2 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-normal text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-normal text-primary md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
