import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { makeFunctionReference } from "convex/server";
import type { FunctionReference } from "convex/server";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const listAllQuery: FunctionReference<"query"> = (() => {
  const ref = makeFunctionReference<"query">("admin/templates:listAll");
  Object.defineProperty(ref, "toString", {
    value: () => "admin/templates:listAll",
    configurable: true,
  });
  return ref;
})();

const createMutation: FunctionReference<"mutation"> = (() => {
  const ref = makeFunctionReference<"mutation">("admin/templates:create");
  Object.defineProperty(ref, "toString", {
    value: () => "admin/templates:create",
    configurable: true,
  });
  return ref;
})();

interface Template {
  _id: string;
  category: string;
  name: string;
  currentVersion: number | null;
  archivedAt?: number;
  pinnedCasesCount: number;
  createdAt: number;
}

const CATEGORIES = ["workplace", "family", "personal", "contractual", "other"];

export function TemplatesListPage() {
  const navigate = useNavigate();
  const templates = useQuery(listAllQuery, {}) as Template[] | undefined;
  const createTemplate = useMutation(createMutation);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [category, setCategory] = useState("workplace");
  const [name, setName] = useState("");
  const [globalGuidance, setGlobalGuidance] = useState("");
  const [coachInstructions, setCoachInstructions] = useState("");
  const [draftCoachInstructions, setDraftCoachInstructions] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !globalGuidance.trim()) return;
    setCreating(true);
    try {
      const id = await createTemplate({
        category,
        name: name.trim(),
        globalGuidance: globalGuidance.trim(),
        coachInstructions: coachInstructions.trim() || undefined,
        draftCoachInstructions: draftCoachInstructions.trim() || undefined,
      });
      setShowCreateForm(false);
      resetForm();
      navigate(`/admin/templates/${id}`);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setCategory("workplace");
    setName("");
    setGlobalGuidance("");
    setCoachInstructions("");
    setDraftCoachInstructions("");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1 font-medium text-text-primary">Templates</h1>
          <Button onClick={() => setShowCreateForm(true)}>
            + New Template
          </Button>
        </div>

        {templates === undefined ? (
          <p className="text-text-tertiary">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-text-tertiary">
            No templates yet. The app will use a built-in default baseline.
            Create a template when you want to tune the Coach's behavior per
            category.
          </p>
        ) : (
          <table aria-label="Templates" className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Category
                </th>
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Current Version
                </th>
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Pinned Cases Count
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t._id}
                  onClick={() => navigate(`/admin/templates/${t._id}`)}
                  className="border-b border-border-default hover:bg-surface-subtle cursor-pointer bg-surface"
                >
                  <td className="py-3 px-4 text-label capitalize text-text-primary">
                    {t.category}
                  </td>
                  <td className="py-3 px-4 text-label text-text-primary">
                    {t.name}
                  </td>
                  <td className="py-3 px-4 text-label text-text-secondary">
                    {t.currentVersion ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-label">
                    {t.archivedAt ? (
                      <span className="text-danger font-medium">Archived</span>
                    ) : (
                      <span className="text-success font-medium">Active</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-label text-text-secondary">
                    {t.pinnedCasesCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Template Dialog */}
      <Dialog
        open={showCreateForm}
        onOpenChange={(open) => {
          setShowCreateForm(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Fill in the fields below to create a new coaching template.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="create-category"
                className="block text-label font-medium text-text-secondary mb-1"
              >
                Category
              </label>
              <select
                id="create-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-border-strong px-3 py-2 text-label bg-surface focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="create-name"
                className="block text-label font-medium text-text-secondary mb-1"
              >
                Name
              </label>
              <input
                id="create-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border-strong px-3 py-2 text-label focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label
                htmlFor="create-globalGuidance"
                className="block text-label font-medium text-text-secondary mb-1"
              >
                Global Guidance
              </label>
              <textarea
                id="create-globalGuidance"
                value={globalGuidance}
                onChange={(e) => setGlobalGuidance(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border-strong px-3 py-2 text-label font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label
                htmlFor="create-coachInstructions"
                className="block text-label font-medium text-text-secondary mb-1"
              >
                Coach Instructions
              </label>
              <textarea
                id="create-coachInstructions"
                value={coachInstructions}
                onChange={(e) => setCoachInstructions(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border-strong px-3 py-2 text-label font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label
                htmlFor="create-draftCoachInstructions"
                className="block text-label font-medium text-text-secondary mb-1"
              >
                Draft Coach Instructions
              </label>
              <textarea
                id="create-draftCoachInstructions"
                value={draftCoachInstructions}
                onChange={(e) => setDraftCoachInstructions(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border-strong px-3 py-2 text-label font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create Template"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
