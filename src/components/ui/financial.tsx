import type { CSSProperties } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { categoryColor } from "@/lib/design-system";

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className="category-badge"
      style={{ "--category-color": categoryColor(category) } as CSSProperties}
    >
      <i aria-hidden="true" />
      {category}
    </span>
  );
}
export function BudgetProgress({
  spent,
  limit,
  category,
}: {
  spent: number;
  limit: number;
  category: string;
}) {
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const state = spent > limit ? "exceeded" : percentage >= 85 ? "approaching" : "within";
  const Icon = state === "within" ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className={`budget-progress ${state}`}
      style={{ "--category-color": categoryColor(category) } as CSSProperties}
    >
      <progress
        value={spent}
        max={Math.max(limit, 1)}
        aria-label={`${category}: ${percentage}% of monthly budget`}
      />
      <span className="budget-progress-status">
        <Icon size={14} />
        {percentage}% used ·{" "}
        {state === "exceeded"
          ? "Over budget"
          : state === "approaching"
            ? "Approaching limit"
            : "Within budget"}
      </span>
    </div>
  );
}
