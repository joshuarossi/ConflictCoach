/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outlet, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TopNav } from "./TopNav";
import { PartyToggle } from "../PartyToggle";
import { useRouteChangeFocus } from "../../hooks/useRouteChangeFocus";

export type ContentWidth = "reading" | "chat";

interface AppLayoutProps {
  /** Max-width mode: "reading" = 720px, "chat" = 1080px. Defaults to "reading". */
  contentWidth?: ContentWidth;
}

export function AppLayout({ contentWidth = "reading" }: AppLayoutProps) {
  useRouteChangeFocus();

  const maxWidthClass =
    contentWidth === "chat" ? "max-w-[1080px]" : "max-w-[720px]";

  const params = useParams<{ caseId: string }>();
  const caseData = useQuery(
    (api as any).cases?.get,
    params.caseId ? { caseId: params.caseId } : "skip",
  ) as { isSolo?: boolean } | null | undefined;

  const isSolo = caseData?.isSolo === true;

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav>{isSolo && <PartyToggle />}</TopNav>
      <main>
        <div className={`mx-auto px-4 py-6 ${maxWidthClass}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/** Layout variant for reading-oriented pages (720px max-width). */
export function ReadingLayout() {
  return <AppLayout contentWidth="reading" />;
}

/** Layout variant for chat pages (1080px max-width). */
export function ChatLayout() {
  return <AppLayout contentWidth="chat" />;
}
