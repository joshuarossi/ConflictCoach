import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { FunctionReference } from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatAuditTimestamp } from "@/lib/formatAuditTimestamp";

// --- Function references (avoid anyApi proxy issues) ---

const getTemplateQuery: FunctionReference<"query"> = (() => {
  const ref = makeFunctionReference<"query">("templates:getTemplate");
  Object.defineProperty(ref, "toString", {
    value: () => "templates:getTemplate",
    configurable: true,
  });
  return ref;
})();

const listVersionsQuery: FunctionReference<"query"> = (() => {
  const ref = makeFunctionReference<"query">("templates:listTemplateVersions");
  Object.defineProperty(ref, "toString", {
    value: () => "templates:listTemplateVersions",
    configurable: true,
  });
  return ref;
})();

const publishMutation: FunctionReference<"mutation"> = (() => {
  const ref = makeFunctionReference<"mutation">("templates:publishNewVersion");
  Object.defineProperty(ref, "toString", {
    value: () => "templates:publishNewVersion",
    configurable: true,
  });
  return ref;
})();

const archiveMutation: FunctionReference<"mutation"> = (() => {
  const ref = makeFunctionReference<"mutation">("templates:archiveTemplate");
  Object.defineProperty(ref, "toString", {
    value: () => "templates:archiveTemplate",
    configurable: true,
  });
  return ref;
})();

interface TemplateVersion {
  _id: string;
  templateId: string;
  version: number;
  globalGuidance: string;
  coachInstructions?: string;
  draftCoachInstructions?: string;
  publishedAt: number;
  publishedByUserId: string;
  publishedByName: string;
  notes?: string;
}

interface TemplateDoc {
  _id: string;
  category: string;
  name: string;
  currentVersionId?: string;
  archivedAt?: number;
  pinnedCasesCount: number;
}

const CATEGORIES = ["workplace", "family", "personal", "contractual", "other"];

export function TemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const template = useQuery(
    getTemplateQuery,
    id ? { templateId: id as Id<"templates"> } : "skip",
  ) as TemplateDoc | undefined | null;

  const versions = useQuery(
    listVersionsQuery,
    id ? { templateId: id as Id<"templates"> } : "skip",
  ) as TemplateVersion[] | undefined;

  const publishVersion = useMutation(publishMutation);
  const archiveTemplate = useMutation(archiveMutation);

  // Form state
  const [category, setCategory] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [globalGuidance, setGlobalGuidance] = useState<string | null>(null);
  const [coachInstructions, setCoachInstructions] = useState<string | null>(null);
  const [draftCoachInstructions, setDraftCoachInstructions] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<TemplateVersion | null>(null);

  // Derive current values from latest version when form hasn't been touched
  const latestVersion = versions?.[0];

  const formCategory = category ?? template?.category ?? "workplace";
  const formName = name ?? template?.name ?? "";
  const formGlobalGuidance = globalGuidance ?? latestVersion?.globalGuidance ?? "";
  const formCoachInstructions = coachInstructions ?? latestVersion?.coachInstructions ?? "";
  const formDraftCoachInstructions = draftCoachInstructions ?? latestVersion?.draftCoachInstructions ?? "";

  if (template === undefined || versions === undefined) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (template === null) {
    return (
      <div className="px-4 py-6">
        <p className="text-red-600">Template not found.</p>
      </div>
    );
  }

  const isArchived = !!template.archivedAt;

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !formGlobalGuidance.trim()) return;
    setPublishing(true);
    try {
      await publishVersion({
        templateId: id as Id<"templates">,
        globalGuidance: formGlobalGuidance.trim(),
        coachInstructions: formCoachInstructions.trim() || undefined,
        draftCoachInstructions: formDraftCoachInstructions.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      // Reset notes after publish
      setNotes("");
      // Reset form overrides so they pick up the new latest version
      setCategory(null);
      setName(null);
      setGlobalGuidance(null);
      setCoachInstructions(null);
      setDraftCoachInstructions(null);
    } finally {
      setPublishing(false);
    }
  }

  async function handleArchive() {
    if (!id) return;
    setArchiving(true);
    try {
      await archiveTemplate({ templateId: id as Id<"templates"> });
      setShowArchiveModal(false);
      navigate("/admin/templates");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div
      style={{ background: "var(--bg-canvas, #f9fafb)" }}
      className="min-h-screen"
    >
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Template</h1>
            <p className="text-gray-600 mt-1">{template.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/templates")}
          >
            Back to Templates
          </Button>
        </div>

        {/* Two-pane layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left pane: Edit form */}
          <div className="lg:col-span-2">
            <div
              className="rounded-lg border border-gray-200 p-6"
              style={{ background: "var(--bg-surface, #ffffff)" }}
            >
              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={formCategory}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                    disabled={isArchived}
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
                    htmlFor="edit-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-globalGuidance"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Global Guidance
                  </label>
                  <textarea
                    id="edit-globalGuidance"
                    value={formGlobalGuidance}
                    onChange={(e) => setGlobalGuidance(e.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-coachInstructions"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Coach Instructions
                  </label>
                  <textarea
                    id="edit-coachInstructions"
                    value={formCoachInstructions}
                    onChange={(e) => setCoachInstructions(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-draftCoachInstructions"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Draft Coach Instructions
                  </label>
                  <textarea
                    id="edit-draftCoachInstructions"
                    value={formDraftCoachInstructions}
                    onChange={(e) => setDraftCoachInstructions(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-notes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Notes
                  </label>
                  <textarea
                    id="edit-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Describe what changed in this version…"
                    disabled={isArchived}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {!isArchived && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowArchiveModal(true)}
                    >
                      Archive Template
                    </Button>
                  )}
                  {isArchived && (
                    <span className="text-sm text-red-600 font-medium">
                      This template is archived.
                    </span>
                  )}
                  {!isArchived && (
                    <Button type="submit" disabled={publishing}>
                      {publishing ? "Publishing…" : "Publish New Version"}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right pane: Version history timeline */}
          <div className="lg:col-span-1">
            <div
              className="rounded-lg border border-gray-200 p-6"
              style={{ background: "var(--bg-surface, #ffffff)" }}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Version History
              </h2>
              {versions.length === 0 ? (
                <p className="text-gray-500 text-sm">No versions yet.</p>
              ) : (
                <div className="space-y-4">
                  {versions.map((ver) => (
                    <div
                      key={ver._id}
                      className="border-l-2 border-gray-200 pl-4 pb-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          Version {ver.version}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingVersion(ver)}
                        >
                          View
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatAuditTimestamp(ver.publishedAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ver.publishedByName}
                      </p>
                      {ver.notes && (
                        <p className="text-sm text-gray-700 mt-1">
                          {ver.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &ldquo;{template.name}&rdquo;?
              {template.pinnedCasesCount > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: {template.pinnedCasesCount} case
                  {template.pinnedCasesCount === 1 ? " is" : "s are"} currently
                  pinned to this template.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowArchiveModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving…" : "Confirm Archive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Version Dialog (read-only) */}
      <Dialog
        open={viewingVersion !== null}
        onOpenChange={(open) => {
          if (!open) setViewingVersion(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version {viewingVersion?.version} (Read-Only)
            </DialogTitle>
            <DialogDescription>
              Published {viewingVersion ? formatAuditTimestamp(viewingVersion.publishedAt) : ""}{" "}
              by {viewingVersion?.publishedByName}
            </DialogDescription>
          </DialogHeader>
          {viewingVersion && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Global Guidance
                </label>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono whitespace-pre-wrap">
                  {viewingVersion.globalGuidance}
                </div>
              </div>
              {viewingVersion.coachInstructions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coach Instructions
                  </label>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono whitespace-pre-wrap">
                    {viewingVersion.coachInstructions}
                  </div>
                </div>
              )}
              {viewingVersion.draftCoachInstructions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Draft Coach Instructions
                  </label>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono whitespace-pre-wrap">
                    {viewingVersion.draftCoachInstructions}
                  </div>
                </div>
              )}
              {viewingVersion.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm whitespace-pre-wrap">
                    {viewingVersion.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
