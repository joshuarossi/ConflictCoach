import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export interface InviteeCaseFormValues {
  mainTopic: string;
  description: string;
  desiredOutcome: string;
}

export interface InviteeCaseFormProps {
  onSubmit: (values: InviteeCaseFormValues) => void;
  disabled?: boolean;
  initialMainTopic?: string;
}

interface FieldErrors {
  mainTopic?: string;
}

function validate(values: InviteeCaseFormValues): FieldErrors {
  const errors: FieldErrors = {};
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
            {...({
              title: "Only you and the AI coach will see this.",
            } as Record<string, string>)}
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

export function InviteeCaseForm({
  onSubmit,
  disabled,
  initialMainTopic,
}: InviteeCaseFormProps) {
  const [mainTopic, setMainTopic] = useState(initialMainTopic ?? "");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: InviteeCaseFormValues = {
      mainTopic,
      description,
      desiredOutcome,
    };
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    onSubmit(values);
  };

  const mainTopicOverLimit = mainTopic.length > MAIN_TOPIC_SOFT_LIMIT;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Main Topic */}
      <div>
        <label
          htmlFor="mainTopic"
          className="block text-label font-medium text-text-primary mb-1"
        >
          Main Topic
        </label>
        <p className="text-meta text-text-secondary mb-1">
          Describe the conflict from your perspective.
        </p>
        <input
          id="mainTopic"
          type="text"
          value={mainTopic}
          onChange={(e) => {
            setMainTopic(e.target.value);
            if (errors.mainTopic && e.target.value.trim()) {
              setErrors((prev) => ({ ...prev, mainTopic: undefined }));
            }
          }}
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

      {/* Description — private */}
      <div>
        <PrivateFieldLabel htmlFor="description">Description</PrivateFieldLabel>
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

      {/* Desired Outcome — private */}
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

      <Button type="submit" className="w-full" disabled={disabled}>
        Continue to Private Coaching
      </Button>
    </form>
  );
}
