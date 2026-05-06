/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export function NewCasePage() {
  const navigate = useNavigate();
  const createCase = useMutation(
    (api as any).cases.create.create,
  );
  const [category, setCategory] = useState("workplace");
  const [mainTopic, setMainTopic] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(isSolo: boolean) {
    if (!mainTopic.trim()) {
      setError("Please enter a topic");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createCase({
        category,
        mainTopic: mainTopic.trim(),
        description: description.trim() || undefined,
        desiredOutcome: desiredOutcome.trim() || undefined,
        isSolo,
      });
      navigate(`/cases/${result.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">New Case</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="workplace">Workplace</option>
            <option value="family">Family</option>
            <option value="personal">Personal</option>
            <option value="contractual">Contractual</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Topic
          </label>
          <input
            type="text"
            value={mainTopic}
            onChange={(e) => setMainTopic(e.target.value)}
            placeholder="What is this conflict about?"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more context..."
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Desired Outcome (optional)
          </label>
          <input
            type="text"
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="What would you like to achieve?"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => handleCreate(false)}
            disabled={isSubmitting}
          >
            Create Case
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCreate(true)}
            disabled={isSubmitting}
            data-testid="new-solo-case"
          >
            New Solo Case
          </Button>
        </div>
      </div>
    </div>
  );
}
