/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.me);
  const updateDisplayName = useMutation(
    (api as any).users.updateDisplayName,
  );
  const { signOut } = useAuthActions();

  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill display name from user data
  useEffect(() => {
    if (user && !initialized) {
      setDisplayName(user.displayName ?? "");
      setInitialized(true);
    }
  }, [user, initialized]);

  // Update local state when user data changes reactively (e.g. after save)
  useEffect(() => {
    if (user && initialized && !isSubmitting) {
      setDisplayName(user.displayName ?? "");
    }
  }, [user?.displayName, initialized, isSubmitting]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        Loading...
      </div>
    );
  }

  const trimmedName = displayName.trim();
  const hasChanges = trimmedName !== (user.displayName ?? "");
  const saveDisabled =
    isSubmitting || !hasChanges || trimmedName.length === 0;

  async function handleSave() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateDisplayName({ displayName: trimmedName });
      setSuccessMessage("Display name updated");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update display name",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div>
      <h1 className="text-h1 font-medium text-text-primary mb-6">Profile</h1>

      <div className="space-y-6">
        {/* Email (read-only) */}
        <div>
          <label className="block text-label font-medium text-text-secondary mb-1">
            Email
          </label>
          <p className="text-body text-text-primary">{user.email}</p>
        </div>

        {/* Display name (editable) */}
        <div>
          <label
            htmlFor="displayName"
            className="block text-label font-medium text-text-secondary mb-1"
          >
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            maxLength={80}
            className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
        </div>

        {/* Save button */}
        <Button onClick={handleSave} disabled={saveDisabled}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>

        {/* Feedback messages */}
        {successMessage && (
          <p className="text-meta text-accent">{successMessage}</p>
        )}
        {errorMessage && (
          <p className="mt-2 text-meta text-danger" role="alert">
            {errorMessage}
          </p>
        )}

        {/* Sign out */}
        <div className="pt-6 border-t border-border-default">
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
