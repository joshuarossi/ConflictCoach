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
  const ref = makeFunctionReference<"query">("templates:listAllTemplates");
  Object.defineProperty(ref, "toString", {
    value: () => "templates:listAllTemplates",
    configurable: true,
  });
  return ref;
})();

const createMutation: FunctionReference<"mutation"> = (() => {
  const ref = makeFunctionReference<"mutation">("templates:createTemplate");
  Object.defineProperty(ref, "toString", {
    value: () => "templates:createTemplate",
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
    <div
      style={{ background: "var(--bg-canvas, #f9fafb)" }}
      className="min-h-screen"
    >
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <Button
            onClick={() => setShowCreateForm(true)}
          >
            + New Template
          </Button>
        </div>

        {templates === undefined ? (
          <p className="text-gray-500">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-gray-500">
            No templates yet. The app will use a built-in default baseline.
            Create a template when you want to tune the Coach's behavior per
            category.
          </p>
        ) : (
          <table aria-label="Templates" className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th
                  className="text-left py-3 px-4 text-sm font-semibold"
                  style={{ color: "var(--text-primary, #111827)" }}
                >
                  Category
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold"
                  style={{ color: "var(--text-primary, #111827)" }}
                >
                  Name
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold"
                  style={{ color: "var(--text-primary, #111827)" }}
                >
                  Current Version
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold"
                  style={{ color: "var(--text-primary, #111827)" }}
                >
                  Status
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold"
                  style={{ color: "var(--text-primary, #111827)" }}
                >
                  Pinned Cases Count
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t._id}
                  onClick={() => navigate(`/admin/templates/${t._id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  style={{ background: "var(--bg-surface, #ffffff)" }}
                >
                  <td
                    className="py-3 px-4 text-sm capitalize"
                    style={{ color: "var(--text-primary, #111827)" }}
                  >
                    {t.category}
                  </td>
                  <td
                    className="py-3 px-4 text-sm"
                    style={{ color: "var(--text-primary, #111827)" }}
                  >
                    {t.name}
                  </td>
                  <td
                    className="py-3 px-4 text-sm"
                    style={{ color: "var(--text-secondary, #6b7280)" }}
                  >
                    {t.currentVersion ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {t.archivedAt ? (
                      <span className="text-red-600 font-medium">Archived</span>
                    ) : (
                      <span className="text-green-600 font-medium">Active</span>
                    )}
                  </td>
                  <td
                    className="py-3 px-4 text-sm"
                    style={{ color: "var(--text-secondary, #6b7280)" }}
                  >
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category
              </label>
              <select
                id="create-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name
              </label>
              <input
                id="create-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label
                htmlFor="create-globalGuidance"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Global Guidance
              </label>
              <textarea
                id="create-globalGuidance"
                value={globalGuidance}
                onChange={(e) => setGlobalGuidance(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                required
              />
            </div>
            <div>
              <label
                htmlFor="create-coachInstructions"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Coach Instructions
              </label>
              <textarea
                id="create-coachInstructions"
                value={coachInstructions}
                onChange={(e) => setCoachInstructions(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="create-draftCoachInstructions"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Draft Coach Instructions
              </label>
              <textarea
                id="create-draftCoachInstructions"
                value={draftCoachInstructions}
                onChange={(e) => setDraftCoachInstructions(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
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
