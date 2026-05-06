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

  // Pre-process: collapse multi-line self-closing <Route ... /> JSX into
  // a single line so the line-by-line parser below can match prettier-
  // formatted attributes. Prettier formats long Route declarations across
  // 3-4 lines, e.g.:
  //   <Route
  //     path="/cases/:caseId/private"
  //     element={<PrivateCoachingPage />}
  //   />
  // We can't use a simple `<Route\b[\s\S]*?\/>` regex because the inner
  // `<PrivateCoachingPage />` element prop matches the lazy `/>` first,
  // truncating the Route mid-attribute. Instead, walk line-by-line: when
  // we see a line that opens `<Route` but doesn't close, accumulate
  // subsequent lines until we hit a line ending in `/>` whose top-level
  // tag balance is zero.
  const rawLines = source.split("\n");
  const flat: string[] = [];
  let buf: string | null = null;
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (buf !== null) {
      buf += " " + trimmed;
      // Close when this line ends in `/>` AND the buffer has balanced
      // angle brackets at the top level (the `/>` we just saw closes
      // the outer <Route>, not an inner JSX element prop).
      if (trimmed === "/>" || trimmed.endsWith(" />")) {
        flat.push(buf.replace(/\s+/g, " "));
        buf = null;
      }
      continue;
    }
    if (
      trimmed.startsWith("<Route") &&
      !trimmed.endsWith("/>") &&
      !trimmed.endsWith(">")
    ) {
      // Multi-line Route opening — start buffering.
      buf = trimmed;
      continue;
    }
    flat.push(line);
  }
  // If we ended mid-buffer (malformed source), append it as-is so we
  // don't lose data.
  if (buf !== null) flat.push(buf);

  const lines = flat;
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
    // Match either attribute order so prettier's layout choices don't
    // break parsing.
    const pageMatch =
      trimmed.match(/<Route\s+path="[^"]+"\s+element=\{<(\w+)\s*\/>\}\s*\/>/) ??
      trimmed.match(/<Route\s+element=\{<(\w+)\s*\/>\}\s+path="[^"]+"\s*\/>/);
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
