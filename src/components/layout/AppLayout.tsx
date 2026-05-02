import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";

export type ContentWidth = "reading" | "chat";

interface AppLayoutProps {
  /** Max-width mode: "reading" = 720px, "chat" = 1080px. Defaults to "reading". */
  contentWidth?: ContentWidth;
}

export function AppLayout({ contentWidth = "reading" }: AppLayoutProps) {
  const maxWidthClass =
    contentWidth === "chat" ? "max-w-[1080px]" : "max-w-[720px]";

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
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
