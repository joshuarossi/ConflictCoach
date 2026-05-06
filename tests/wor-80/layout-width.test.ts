/**
 * WOR-80: Layout width verification.
 *
 * Verifies that each page component is nested under the correct layout
 * (ReadingLayout at 720px or ChatLayout at 1080px) per the App.tsx route
 * definitions and DesignDoc §2.3.
 *
 * This test reads App.tsx source and statically verifies the route/layout
 * nesting structure rather than rendering the component tree, since the
 * layout assignment is a structural guarantee, not a runtime behavior.
 *
 * Acceptance criteria covered:
 *   - All pages render correctly under both reading-width (720px) and
 *     chat-width (1080px) layouts per WOR-30 conventions
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const APP_TSX_PATH = path.resolve(__dirname, "../../src/App.tsx");
const appSource = fs.readFileSync(APP_TSX_PATH, "utf-8");

/**
 * Expected layout assignments per the contract and App.tsx route structure.
 *
 * Key: page component name as it appears in JSX (e.g. <Dashboard />)
 * Value: "ReadingLayout" | "ChatLayout" | "none" (public, no layout wrapper)
 */
const EXPECTED_LAYOUTS: Record<string, string> = {
  // Public routes — no layout wrapper
  LandingPage: "none",
  LoginPage: "none",
  InviteAcceptPage: "none",

  // ReadingLayout (720px)
  Dashboard: "ReadingLayout",
  NewCasePage: "ReadingLayout",
  CaseDetail: "ReadingLayout",
  ReadyForJointPage: "ReadingLayout",
  InviteSharingPage: "ReadingLayout",
  ClosedCasePage: "ReadingLayout",

  // ChatLayout (1080px)
  PrivateCoachingPage: "ChatLayout",
  JointChatPage: "ChatLayout",

  // Admin routes — ReadingLayout
  TemplatesListPage: "ReadingLayout",
  TemplateEditPage: "ReadingLayout",
  AuditLogPage: "ReadingLayout",
};

/**
 * Simple parser: find which layout block each page route is nested under
 * by scanning the JSX structure of App.tsx.
 *
 * This works by tracking the most recent `<Route element={<XxxLayout />}>`
 * and associating subsequent `<Route ... element={<PageName />} />` with it.
 */
function parseLayoutAssignments(source: string): Record<string, string> {
  const assignments: Record<string, string> = {};

  // Split into lines and track nesting context
  const lines = source.split("\n");
  const layoutStack: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect layout wrapper Route opening: <Route element={<ReadingLayout />}>
    const layoutMatch = trimmed.match(
      /<Route\s+element=\{<(ReadingLayout|ChatLayout)\s*\/>\}/,
    );
    if (layoutMatch && !trimmed.endsWith("/>")) {
      layoutStack.push(layoutMatch[1]);
      continue;
    }

    // Detect closing </Route> — pop the layout stack
    if (trimmed === "</Route>") {
      if (layoutStack.length > 0) {
        layoutStack.pop();
      }
      continue;
    }

    // Detect page Route: <Route path="..." element={<PageName />} />
    const pageMatch = trimmed.match(
      /<Route\s+path="[^"]+"\s+element=\{<(\w+)\s*\/>\}\s*\/>/,
    );
    if (pageMatch) {
      const pageName = pageMatch[1];
      const currentLayout =
        layoutStack.length > 0 ? layoutStack[layoutStack.length - 1] : "none";
      assignments[pageName] = currentLayout;
    }
  }

  return assignments;
}

const actualAssignments = parseLayoutAssignments(appSource);

describe("WOR-80: Page layout width assignments", () => {
  it("App.tsx defines routes for all verified pages", () => {
    const expectedPages = Object.keys(EXPECTED_LAYOUTS);
    const actualPages = Object.keys(actualAssignments);

    const missing = expectedPages.filter((p) => !actualPages.includes(p));
    expect(
      missing,
      `Pages missing from App.tsx routes: ${missing.join(", ")}`,
    ).toHaveLength(0);
  });

  it.each(Object.entries(EXPECTED_LAYOUTS))(
    "%s is nested under %s",
    (pageName, expectedLayout) => {
      const actual = actualAssignments[pageName];
      expect(actual).toBeDefined();
      expect(actual).toBe(expectedLayout);
    },
  );
});
