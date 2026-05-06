import { useState } from "react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "workplace",
  "family",
  "personal",
  "contractual",
  "other",
] as const;

export interface NewCaseFormValues {
  category: string;
  mainTopic: string;
  description: string;
  desiredOutcome: string;
}

interface NewCaseFormProps {
  onSubmit?: (values: NewCaseFormValues) => void;
  // Optional handler for the "New Solo Case" path (WOR-55 AC1).
  // When provided, a second submit button is rendered. Field validation
  // runs the same way before the handler is called.
  onSubmitSolo?: (values: NewCaseFormValues) => void;
  disabled?: boolean;
}

interface FieldErrors {
  category?: string;
  mainTopic?: string;
  description?: string;
}

function validate(values: NewCaseFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.category) {
    errors.category = "Please select a category.";
  }
  if (!values.mainTopic.trim()) {
    errors.mainTopic = "Please describe the main topic.";
  }
  if (!values.description.trim()) {
    errors.description = "Please provide a description.";
  }
  return errors;
}

export function NewCaseForm({
  onSubmit,
  onSubmitSolo,
  disabled,
}: NewCaseFormProps) {
  const [category, setCategory] = useState("");
  const [mainTopic, setMainTopic] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const collectAndValidate = (): NewCaseFormValues | null => {
    const values: NewCaseFormValues = {
      category,
      mainTopic,
      description,
      desiredOutcome,
    };
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return null;
    return values;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = collectAndValidate();
    if (values) onSubmit?.(values);
  };

  const handleSubmitSolo = () => {
    const values = collectAndValidate();
    if (values) onSubmitSolo?.(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-label font-medium text-text-primary mb-1"
        >
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-describedby={errors.category ? "category-error" : undefined}
          className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Select a category…</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        {errors.category && (
          <p id="category-error" className="mt-1 text-meta text-danger" role="alert">
            {errors.category}
          </p>
        )}
      </div>

      {/* Main Topic */}
      <div>
        <label
          htmlFor="mainTopic"
          className="block text-label font-medium text-text-primary mb-1"
        >
          Main Topic
        </label>
        <input
          id="mainTopic"
          type="text"
          value={mainTopic}
          onChange={(e) => setMainTopic(e.target.value)}
          placeholder="What is this conflict about?"
          aria-describedby={errors.mainTopic ? "mainTopic-error" : undefined}
          className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {errors.mainTopic && (
          <p id="mainTopic-error" className="mt-1 text-meta text-danger" role="alert">
            {errors.mainTopic}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-label font-medium text-text-primary mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the situation in your own words…"
          rows={4}
          aria-describedby={errors.description ? "description-error" : undefined}
          className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
        {errors.description && (
          <p id="description-error" className="mt-1 text-meta text-danger" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      {/* Desired Outcome (optional) */}
      <div>
        <label
          htmlFor="desiredOutcome"
          className="block text-label font-medium text-text-primary mb-1"
        >
          Desired Outcome{" "}
          <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <textarea
          id="desiredOutcome"
          value={desiredOutcome}
          onChange={(e) => setDesiredOutcome(e.target.value)}
          placeholder="What would a good resolution look like?"
          rows={3}
          className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="flex-1" disabled={disabled}>
          Start Case
        </Button>
        {onSubmitSolo && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={disabled}
            onClick={handleSubmitSolo}
            data-testid="new-solo-case"
          >
            New Solo Case
          </Button>
        )}
      </div>
    </form>
  );
}
