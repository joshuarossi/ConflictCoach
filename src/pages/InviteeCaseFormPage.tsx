/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InviteeCaseForm,
  type InviteeCaseFormValues,
} from "@/components/InviteeCaseForm";
import { parseConvexError } from "@/lib/errors";

function FormSkeleton() {
  return (
    <div className="space-y-6" data-testid="invitee-form-skeleton">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 px-4"
      data-testid="case-not-found"
    >
      <h1 className="text-h1 font-medium text-text-primary mb-2">404</h1>
      <p className="text-h3 text-text-secondary">Case not found.</p>
      <Link
        to="/dashboard"
        className="mt-4 text-accent hover:text-accent-hover underline"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

export function InviteeCaseFormPage() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = caseIdParam as Id<"cases">;
  const navigate = useNavigate();

  const caseData = useQuery(api.cases.get, { caseId });
  const updateMyForm = useMutation(
    (api as any).cases.updateMyForm.updateMyForm,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Loading state
  if (caseData === undefined) {
    return <FormSkeleton />;
  }

  // Not found / not authorized
  if (caseData === null) {
    return <NotFoundView />;
  }

  async function handleSubmit(values: InviteeCaseFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateMyForm({
        caseId,
        mainTopic: values.mainTopic.trim(),
        description: values.description.trim() || undefined,
        desiredOutcome: values.desiredOutcome.trim() || undefined,
      });
      navigate(`/cases/${caseId}/private`);
    } catch (err) {
      const parsed = parseConvexError(err);
      setSubmitError(parsed.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-h1 font-bold text-text-primary mb-2">
        Your Perspective
      </h1>
      <p className="text-body text-text-secondary mb-6">
        Share your view of the conflict before starting private coaching
        {caseData.otherPartyName ? ` with ${caseData.otherPartyName}` : ""}.
      </p>
      {submitError && (
        <p className="mb-4 text-meta text-danger" role="alert">
          {submitError}
        </p>
      )}
      <InviteeCaseForm onSubmit={handleSubmit} disabled={isSubmitting} />
    </div>
  );
}
