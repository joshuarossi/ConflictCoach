/**
 * WOR-82: TopNav admin entry point for ADMIN users.
 *
 * ACs:
 * 1. ADMIN user sees Admin button with dropdown links to /admin/templates and /admin/audit
 * 2. Non-admin user sees no Admin entry point
 * 3. Role check uses server-side trusted data from useQuery(api.users.me)
 * 4. Admin button styling uses correct design-token classes
 * 5. Dropdown links navigate to correct admin routes
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import {
  makeUseQueryDispatcher,
  apiMock,
  defaultUser,
  type ConvexMockOptions,
} from "../__helpers__/convex-mocks";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("../../convex/_generated/api", () => apiMock);

const opts = vi.hoisted(() => ({
  current: {} as ConvexMockOptions,
}));
vi.mock("convex/react", () => ({
  useQuery: (token: string) => makeUseQueryDispatcher(opts.current)(token),
  useMutation: () => vi.fn(),
}));

import { AppRoutes } from "@/App";

const adminUser = {
  ...defaultUser,
  role: "ADMIN" as const,
  displayName: "Admin",
};
const regularUser = {
  ...defaultUser,
  role: "USER" as const,
  displayName: "Regular",
};

describe("WOR-82: TopNav admin entry point", () => {
  describe("AC1: ADMIN user sees Admin menu with dropdown links", () => {
    beforeEach(() => {
      opts.current = { user: adminUser, cases: [] };
    });

    test("renders an Admin button in the TopNav", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole("button", { name: /admin/i }),
      ).toBeInTheDocument();
    });

    test("clicking Admin button reveals Templates and Audit Log links", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      await user.click(screen.getByRole("button", { name: /admin/i }));
      expect(screen.getByRole("link", { name: /templates/i })).toHaveAttribute(
        "href",
        "/admin/templates",
      );
      expect(screen.getByRole("link", { name: /audit log/i })).toHaveAttribute(
        "href",
        "/admin/audit",
      );
    });
  });

  describe("AC2: Non-admin user sees no Admin entry point", () => {
    beforeEach(() => {
      opts.current = { user: regularUser, cases: [] };
    });

    test("no Admin button is rendered for USER role", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        screen.queryByRole("button", { name: /admin/i }),
      ).not.toBeInTheDocument();
    });

    test("no admin links are present in the DOM for USER role", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        screen.queryByRole("link", { name: /templates/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /audit log/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("AC3: Role check uses server-side trusted data from useQuery(api.users.me)", () => {
    test("ADMIN role from useQuery shows Admin button", () => {
      opts.current = { user: adminUser, cases: [] };
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole("button", { name: /admin/i }),
      ).toBeInTheDocument();
    });

    test("USER role from useQuery hides Admin button", () => {
      opts.current = { user: regularUser, cases: [] };
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        screen.queryByRole("button", { name: /admin/i }),
      ).not.toBeInTheDocument();
    });

    test("undefined user (loading state) hides Admin button", () => {
      opts.current = { user: undefined, cases: [] };
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        screen.queryByRole("button", { name: /admin/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("AC4: Admin button styling uses design-token classes", () => {
    beforeEach(() => {
      opts.current = { user: adminUser, cases: [] };
    });

    test("Admin button has text-label and text-text-secondary classes", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const adminButton = screen.getByRole("button", { name: /admin/i });
      expect(adminButton.className).toContain("text-label");
      expect(adminButton.className).toContain("text-text-secondary");
    });

    test("Admin button has hover:bg-surface-subtle class", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const adminButton = screen.getByRole("button", { name: /admin/i });
      expect(adminButton.className).toContain("hover:bg-surface-subtle");
    });

    test("Admin button has focus-visible outline token classes", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const adminButton = screen.getByRole("button", { name: /admin/i });
      expect(adminButton.className).toContain("focus-visible:outline-2");
      expect(adminButton.className).toContain("focus-visible:outline-accent");
      expect(adminButton.className).toContain("focus-visible:outline-offset-2");
    });
  });

  describe("AC5: Dropdown links navigate to correct admin routes", () => {
    beforeEach(() => {
      opts.current = { user: adminUser, cases: [] };
    });

    test("Templates link has href /admin/templates", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      await user.click(screen.getByRole("button", { name: /admin/i }));
      const templatesLink = screen.getByRole("link", { name: /templates/i });
      expect(templatesLink).toHaveAttribute("href", "/admin/templates");
    });

    test("Audit Log link has href /admin/audit", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      await user.click(screen.getByRole("button", { name: /admin/i }));
      const auditLink = screen.getByRole("link", { name: /audit log/i });
      expect(auditLink).toHaveAttribute("href", "/admin/audit");
    });
  });
});
