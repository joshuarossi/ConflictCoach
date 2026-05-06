/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { NewCaseForm, type NewCaseFormValues } from "@/components/NewCaseForm";

export function NewCasePage() {
  const navigate = useNavigate();
  const createCase = useMutation((api as any).cases.create.create);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(values: NewCaseFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createCase({
        category: values.category,
        mainTopic: values.mainTopic.trim(),
        description: values.description.trim() || undefined,
        desiredOutcome: values.desiredOutcome.trim() || undefined,
        isSolo: values.isSolo,
      });
      navigate(`/cases/${result.caseId}/invite`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create case",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-h1 font-bold text-text-primary mb-6">New Case</h1>
      <NewCaseForm onSubmit={handleSubmit} disabled={isSubmitting} />
      {submitError && (
        <p className="mt-4 text-meta text-danger" role="alert">
          {submitError}
        </p>
      )}
    </div>
  );
}
