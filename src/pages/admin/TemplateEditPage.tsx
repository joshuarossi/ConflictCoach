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
  const ref = makeFunctionReference<"query">("admin/templates:get");
  Object.defineProperty(ref, "toString", {
    value: () => "admin/templates:get",
    configurable: true,
  });
  return ref;
})();

const listVersionsQuery: FunctionReference<"query"> = (() => {
  const ref = makeFunctionReference<"query">("admin/templates:listVersions");
  Object.defineProperty(ref, "toString", {
    value: () => "admin/templates:listVersions",
    configurable: true,
  });
  return ref;
})();

const publishMutation: FunctionReference<"mutation"> = (() => {
  const ref = makeFunctionReference<"mutation">("admin/templates:publishNewVersion");
  Object.defineProperty(ref, "toString", {
    value: () => "admin/templates:publishNewVersion",
    configurable: true,
  });
  return ref;
})();

const archiveMutation: FunctionReference<"mutation"> = (() => {
  const ref = makeFunctionReference<"mutation">("admin/templates:archive");
  Object.defineProperty(ref, "toString", {
    value: () => "admin/templates:archive",
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
  publishedByName?: string;
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

  const rawVersions = useQuery(
    listVersionsQuery,
    id ? { templateId: id as Id<"templates"> } : "skip",
  ) as TemplateVersion[] | undefined;

  // Ensure descending order by version number (newest first)
  const versions = rawVersions
    ? [...rawVersions].sort((a, b) => b.version - a.version)
    : undefined;

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
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
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
        <p className="text-text-tertiary">Loading…</p>
      </div>
    );
  }

  if (template === null) {
    return (
      <div className="px-4 py-6">
        <p className="text-danger">Template not found.</p>
      </div>
    );
  }

  const isArchived = !!template.archivedAt;

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !formGlobalGuidance.trim()) return;
    setPublishing(true);
    setPublishError(null);
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
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish version");
    } finally {
      setPublishing(false);
    }
  }

  async function handleArchive() {
    if (!id) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await archiveTemplate({ templateId: id as Id<"templates"> });
      setShowArchiveModal(false);
      navigate("/admin/templates");
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive template");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-h1 font-medium text-text-primary">Edit Template</h1>
            <p className="text-text-secondary mt-1">{template.name}</p>
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
            <div className="rounded-lg border border-border-default bg-surface p-6">
              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-category"
                    className="block text-label font-medium text-text-secondary mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={formCategory}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-label bg-surface focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
                    className="block text-label font-medium text-text-secondary mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-label focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-globalGuidance"
                    className="block text-label font-medium text-text-secondary mb-1"
                  >
                    Global Guidance
                  </label>
                  <textarea
                    id="edit-globalGuidance"
                    value={formGlobalGuidance}
                    onChange={(e) => setGlobalGuidance(e.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-label font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-coachInstructions"
                    className="block text-label font-medium text-text-secondary mb-1"
                  >
                    Coach Instructions
                  </label>
                  <textarea
                    id="edit-coachInstructions"
                    value={formCoachInstructions}
                    onChange={(e) => setCoachInstructions(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-label font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-draftCoachInstructions"
                    className="block text-label font-medium text-text-secondary mb-1"
                  >
                    Draft Coach Instructions
                  </label>
                  <textarea
                    id="edit-draftCoachInstructions"
                    value={formDraftCoachInstructions}
                    onChange={(e) => setDraftCoachInstructions(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-label font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    disabled={isArchived}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-notes"
                    className="block text-label font-medium text-text-secondary mb-1"
                  >
                    Notes
                  </label>
                  <textarea
                    id="edit-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-label focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Describe what changed in this version…"
                    disabled={isArchived}
                  />
                </div>

                {publishError && (
                  <p role="alert" className="text-label text-danger">
                    {publishError}
                  </p>
                )}
                {archiveError && (
                  <p role="alert" className="text-label text-danger">
                    {archiveError}
                  </p>
                )}
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
                    <span className="text-label text-danger font-medium">
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
            <div className="rounded-lg border border-border-default bg-surface p-6">
              <h2 className="text-h3 font-medium text-text-primary mb-4">
                Version History
              </h2>
              {versions.length === 0 ? (
                <p className="text-text-tertiary text-label">No versions yet.</p>
              ) : (
                <div className="space-y-4">
                  {versions.map((ver) => (
                    <div
                      key={ver._id}
                      data-testid="version-entry"
                      className="border-l-2 border-border-default pl-4 pb-2"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-label font-medium text-text-primary">
                          Version {ver.version}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingVersion(ver)}
                        >
                          View
                        </Button>
                      </div>
                      <p className="text-timestamp text-text-tertiary mt-1">
                        {formatAuditTimestamp(ver.publishedAt)}
                      </p>
                      <p className="text-timestamp text-text-tertiary">
                        {ver.publishedByName || "Unknown"}
                      </p>
                      {ver.notes && (
                        <p className="text-label text-text-secondary mt-1">
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
                <span className="block mt-2 text-danger font-medium">
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

      {/* View Version Dialog (read-only) — only mounted when a version is selected */}
      {viewingVersion && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setViewingVersion(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Version {viewingVersion.version} (Read-Only)
              </DialogTitle>
              <DialogDescription>
                Published {formatAuditTimestamp(viewingVersion.publishedAt)}{" "}
                by {viewingVersion.publishedByName || "Unknown"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-label font-medium text-text-secondary mb-1">
                  Global Guidance
                </label>
                <div className="rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-label font-mono whitespace-pre-wrap">
                  {viewingVersion.globalGuidance}
                </div>
              </div>
              {viewingVersion.coachInstructions && (
                <div>
                  <label className="block text-label font-medium text-text-secondary mb-1">
                    Coach Instructions
                  </label>
                  <div className="rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-label font-mono whitespace-pre-wrap">
                    {viewingVersion.coachInstructions}
                  </div>
                </div>
              )}
              {viewingVersion.draftCoachInstructions && (
                <div>
                  <label className="block text-label font-medium text-text-secondary mb-1">
                    Draft Coach Instructions
                  </label>
                  <div className="rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-label font-mono whitespace-pre-wrap">
                    {viewingVersion.draftCoachInstructions}
                  </div>
                </div>
              )}
              {viewingVersion.notes && (
                <div>
                  <label className="block text-label font-medium text-text-secondary mb-1">
                    Notes
                  </label>
                  <div className="rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-label whitespace-pre-wrap">
                    {viewingVersion.notes}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
