import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

export function TemplatesListPage() {
  const templates = useQuery(api.templates.listAllTemplates);

  if (templates === undefined) {
    return (
      <div>
        <h1 className="text-h1 font-bold text-text-primary mb-4">Templates</h1>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div>
        <h1 className="text-h1 font-bold text-text-primary mb-4">Templates</h1>
        <p className="text-text-secondary">
          No templates yet. The app will use a built-in default baseline.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-h1 font-bold text-text-primary mb-4">Templates</h1>
      <div className="space-y-3">
        {templates.map((template: { _id: string; name: string; status: string }) => (
          <div
            key={template._id}
            className="rounded-md border border-border-default bg-surface px-4 py-3 shadow-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">
                {template.name}
              </span>
              <span className="text-meta text-text-tertiary">
                {template.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
