import type { ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <PageTransition>
      <Card className="animate-rise p-7 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
      </Card>
    </PageTransition>
  );
}
