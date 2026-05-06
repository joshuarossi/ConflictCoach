import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, ChevronDown, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { value: "workplace", label: "Workplace" },
  { value: "family", label: "Family" },
  { value: "personal", label: "Personal relationship" },
  { value: "contractual", label: "Contractual/business" },
  { value: "other", label: "Other" },
] as const;

export interface NewCaseFormValues {
  category: string;
  mainTopic: string;
  description: string;
  desiredOutcome: string;
  isSolo: boolean;
}

export interface NewCaseFormProps {
  onSubmit?: (values: NewCaseFormValues) => void;
  onSubmitSolo?: (values: NewCaseFormValues) => void;
  disabled?: boolean;
}

interface FieldErrors {
  category?: string;
  mainTopic?: string;
}

function validate(values: NewCaseFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.category) {
    errors.category = "Please select a category.";
  }
  if (!values.mainTopic.trim()) {
    errors.mainTopic = "Please describe the main topic.";
  }
  return errors;
}

const MAIN_TOPIC_SOFT_LIMIT = 140;

function PrivateFieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <label
        htmlFor={htmlFor}
        className="block text-label font-medium text-text-primary"
      >
        <span className="inline-flex items-center gap-1.5">
          <Lock
            className="h-4 w-4 text-text-secondary"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {children}
        </span>
      </label>
      <p className="text-meta text-text-secondary mt-0.5">
        <strong>Private to you</strong> — Only you and the AI coach will see
        this.
      </p>
    </div>
  );
}

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function NewCaseForm({ onSubmit, onSubmitSolo, disabled }: NewCaseFormProps) {
  const [category, setCategory] = useState("");
  const [mainTopic, setMainTopic] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [isSolo, setIsSolo] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const collectAndValidate = (): NewCaseFormValues | null => {
    const values: NewCaseFormValues = {
      category,
      mainTopic,
      description,
      desiredOutcome,
      isSolo,
    };
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return null;
    return values;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = collectAndValidate();
    if (values) {
      if (values.isSolo && onSubmitSolo) {
        onSubmitSolo(values);
      } else {
        onSubmit?.(values);
      }
    }
  };

  const mainTopicOverLimit = mainTopic.length > MAIN_TOPIC_SOFT_LIMIT;

  // Progressive disclosure: reveal steps sequentially
  // If there are validation errors, show the fields that have errors
  const showMainTopic = !!category || !!errors.mainTopic;
  const showDescription = showMainTopic && !!mainTopic.trim();
  const showOutcome = showDescription;
  const showAdvancedAndSubmit = showMainTopic;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Category — radio cards */}
      <fieldset disabled={disabled}>
        <legend className="block text-label font-medium text-text-primary mb-2">
          Category
        </legend>
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Category"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.value;
            return (
              <label
                key={cat.value}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/5"
                    : "border-border-default bg-surface hover:border-accent/50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={isSelected}
                  onChange={() => setCategory(cat.value)}
                  disabled={disabled}
                  className="accent-accent"
                  aria-label={cat.label}
                />
                <span className="text-body font-medium text-text-primary">
                  {cat.label}
                </span>
              </label>
            );
          })}
        </div>
        {errors.category && (
          <p className="mt-1 text-meta text-danger" role="alert">
            {errors.category}
          </p>
        )}
      </fieldset>

      {/* Step 2: Main Topic */}
      {showMainTopic && (
        <div>
          <label
            htmlFor="mainTopic"
            className="block text-label font-medium text-text-primary mb-1"
          >
            Main Topic
          </label>
          <p className="text-meta text-text-secondary mb-1">
            This will be visible to both parties in the case.
          </p>
          <input
            id="mainTopic"
            type="text"
            value={mainTopic}
            onChange={(e) => setMainTopic(e.target.value)}
            disabled={disabled}
            placeholder="What is this conflict about?"
            aria-describedby="mainTopic-counter mainTopic-error"
            className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex justify-between mt-1">
            {errors.mainTopic ? (
              <p
                id="mainTopic-error"
                className="text-meta text-danger"
                role="alert"
              >
                {errors.mainTopic}
              </p>
            ) : (
              <span />
            )}
            <span
              id="mainTopic-counter"
              className={`text-meta ${mainTopicOverLimit ? "text-danger" : "text-text-tertiary"}`}
              aria-live="polite"
            >
              {mainTopic.length}/{MAIN_TOPIC_SOFT_LIMIT}
            </span>
          </div>
        </div>
      )}

      {/* Step 3: Description — private */}
      {showDescription && (
        <div>
          <PrivateFieldLabel htmlFor="description">
            Description
          </PrivateFieldLabel>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              autoGrow(e.target);
            }}
            disabled={disabled}
            placeholder="Describe the situation in your own words…"
            rows={5}
            className="w-full rounded-md border border-border-default bg-private-tint px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none overflow-hidden"
          />
        </div>
      )}

      {/* Step 4: Desired Outcome — private */}
      {showOutcome && (
        <div>
          <PrivateFieldLabel htmlFor="desiredOutcome">
            Desired Outcome{" "}
            <span className="text-text-tertiary font-normal">(optional)</span>
          </PrivateFieldLabel>
          <textarea
            id="desiredOutcome"
            value={desiredOutcome}
            onChange={(e) => {
              setDesiredOutcome(e.target.value);
              autoGrow(e.target);
            }}
            disabled={disabled}
            placeholder="What would a good resolution look like?"
            rows={3}
            className="w-full rounded-md border border-border-default bg-private-tint px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none overflow-hidden"
          />
        </div>
      )}

      {/* Advanced — solo mode */}
      {showAdvancedAndSubmit && (
        <div className="border border-border-default rounded-lg">
          <button
            type="button"
            className="flex items-center gap-2 w-full px-4 py-3 text-label font-medium text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            aria-expanded={advancedOpen}
            disabled={disabled}
          >
            {advancedOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Advanced
          </button>
          {advancedOpen && (
            <div className="px-4 pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSolo}
                  onChange={(e) => setIsSolo(e.target.checked)}
                  disabled={disabled}
                  className="accent-accent"
                />
                <span className="text-body text-text-primary">
                  Create this as a solo test case (I'll play both parties)
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={disabled}>
        Start Case
      </Button>
    </form>
  );
}
