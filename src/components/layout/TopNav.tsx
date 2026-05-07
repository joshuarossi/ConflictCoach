/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";

/** Maps route segments to human-readable phase labels. */
function getPhaseLabel(segment: string | undefined): string | null {
  switch (segment) {
    case "private":
      return "Private Coaching";
    case "joint":
      return "Joint Chat";
    case "closed":
      return "Closed";
    default:
      return null;
  }
}

/** Maps a case status to a human-readable phase label, fallback for routes
 * where the URL alone doesn't determine the phase (e.g. /cases/:caseId). */
function getStatusPhaseLabel(status: string | undefined): string | null {
  switch (status) {
    case "DRAFT_PRIVATE_COACHING":
    case "BOTH_PRIVATE_COACHING":
      return "Private Coaching";
    case "READY_FOR_JOINT":
      return "Ready for Joint";
    case "JOINT_ACTIVE":
      return "Joint Chat";
    case "CLOSED_RESOLVED":
    case "CLOSED_UNRESOLVED":
    case "CLOSED_ABANDONED":
      return "Closed";
    default:
      return null;
  }
}

export interface TopNavProps {
  /** Optional slot for PartyToggle or other controls */
  children?: ReactNode;
}

function UserMenu() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const user = useQuery(api.users.me);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayLabel = user?.displayName || user?.email || "Account";

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-label text-text-secondary hover:bg-surface-subtle"
        aria-label="User menu"
        data-testid="user-menu-button"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-subtle text-timestamp font-medium text-text-secondary">
          {(user?.displayName || user?.email || "?")[0].toUpperCase()}
        </span>
        <span className="hidden sm:inline">{displayLabel}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-surface py-1 shadow-3"
        >
          <div className="border-b px-3 py-2 text-label text-text-tertiary truncate">
            {user?.email}
          </div>
          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full px-3 py-2 text-left text-label text-text-secondary hover:bg-surface-subtle"
            data-testid="logout-button"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function TopNav({ children }: TopNavProps) {
  const params = useParams<{ caseId: string }>();
  const location = useLocation();

  const isCaseRoute = !!params.caseId;

  // Fetch case context for inside-case mode. The query result shape is
  // intentionally permissive — TopNav only reads `otherPartyName` and
  // `status`, so any API that returns those works.
  const caseContext = useQuery(
    (api as any).cases?.get,
    isCaseRoute ? { caseId: params.caseId } : "skip",
  ) as { otherPartyName?: string; status?: string } | null | undefined;

  // Determine phase from the URL segment after /cases/:caseId/, falling back
  // to the case status when the URL doesn't say (e.g. /cases/:id).
  const pathSegments = location.pathname.split("/");
  const caseIdIndex = pathSegments.indexOf(params.caseId ?? "");
  const phaseSegment =
    caseIdIndex >= 0 ? pathSegments[caseIdIndex + 1] : undefined;
  const phaseLabel =
    getPhaseLabel(phaseSegment) ?? getStatusPhaseLabel(caseContext?.status);

  if (isCaseRoute) {
    const otherPartyName = caseContext?.otherPartyName;
    const caseLabel = otherPartyName
      ? `Case with ${otherPartyName}`
      : `Case ${params.caseId}`;
    return (
      <nav
        aria-label="Case navigation"
        className="border-b bg-surface px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-label text-accent hover:text-accent-hover"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-text-tertiary">|</span>
          <span className="text-label font-medium text-text-primary">
            {caseLabel}
            {phaseLabel && (
              <>
                <span className="text-text-tertiary"> · </span>
                <span data-testid="phase-indicator">{phaseLabel}</span>
              </>
            )}
          </span>
          {children && <div className="ml-auto">{children}</div>}
        </div>
      </nav>
    );
  }

  // Dashboard / non-case mode
  const isDashboardActive = location.pathname.startsWith("/dashboard");

  return (
    <nav aria-label="Main navigation" className="border-b bg-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="text-h3 font-medium text-text-primary">
          Conflict Coach
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`text-label px-3 py-1.5 rounded-md hover:bg-surface-subtle ${
                isDashboardActive
                  ? "text-text-primary hover:text-text-primary"
                  : "text-text-secondary"
              }`}
            >
              Dashboard
            </Link>
          </div>
          {children}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
