/**
 * WOR-83: Unit tests for ProfilePage component.
 *
 * Covers AC3 (email read-only), AC4 (editable displayName), AC5 (save mutation),
 * AC6 (maxLength 80), AC7 (sign-out button).
 *
 * Red-state expectation: these tests will fail with "Cannot find module
 * '@/pages/ProfilePage'" until the production component is created.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// --- Mocks ---

const mockNavigate = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockUpdateDisplayName = vi.fn().mockResolvedValue(undefined);

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: mockSignOut }),
}));

vi.mock("../../convex/_generated/api", () => ({
  api: {
    users: {
      me: "users:me",
      updateDisplayName: "users:updateDisplayName",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (token: string) => {
    switch (token) {
      case "users:me":
        return {
          _id: "users:test",
          email: "testuser@example.com",
          displayName: "Jane Doe",
          role: "USER" as const,
          createdAt: 1700000000000,
        };
      default:
        return undefined;
    }
  },
  useMutation: (token: string) => {
    switch (token) {
      case "users:updateDisplayName":
        return mockUpdateDisplayName;
      default:
        return vi.fn();
    }
  },
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { ProfilePage } from "@/pages/ProfilePage";

function renderProfilePage() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// --- Tests ---

describe("WOR-83: ProfilePage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSignOut.mockClear();
    mockUpdateDisplayName.mockClear();
  });

  describe("AC3: Email displayed as read-only text", () => {
    test("renders the user's email as static text", () => {
      renderProfilePage();
      expect(screen.getByText("testuser@example.com")).toBeVisible();
    });

    test("email is not rendered in an editable input", () => {
      renderProfilePage();
      expect(
        screen.queryByRole("textbox", { name: /email/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("AC4: Editable display name input", () => {
    test("renders a display name input pre-filled with the current value", () => {
      renderProfilePage();
      const input = screen.getByRole("textbox", { name: /display name/i });
      expect(input).toHaveValue("Jane Doe");
    });
  });

  describe("AC5: Save calls updateDisplayName mutation", () => {
    test("clicking Save with a changed name calls the mutation", async () => {
      renderProfilePage();
      const input = screen.getByRole("textbox", { name: /display name/i });
      fireEvent.change(input, { target: { value: "New Name" } });

      const saveButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateDisplayName).toHaveBeenCalledWith({
          displayName: "New Name",
        });
      });
      expect(mockUpdateDisplayName).toHaveBeenCalledTimes(1);
    });

    test("Save is disabled when input matches current displayName", () => {
      renderProfilePage();
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    test("Save is disabled when input is empty", () => {
      renderProfilePage();
      const input = screen.getByRole("textbox", { name: /display name/i });
      fireEvent.change(input, { target: { value: "" } });

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("AC6: Display name maxLength 80", () => {
    test("the display name input has maxLength attribute of 80", () => {
      renderProfilePage();
      const input = screen.getByRole("textbox", { name: /display name/i });
      expect(input).toHaveAttribute("maxLength", "80");
    });
  });

  describe("AC7: Sign out button", () => {
    test("renders a Sign out button", () => {
      renderProfilePage();
      expect(
        screen.getByRole("button", { name: /sign out/i }),
      ).toBeVisible();
    });

    test("clicking Sign out calls signOut and navigates to /login", async () => {
      renderProfilePage();
      const signOutButton = screen.getByRole("button", {
        name: /sign out/i,
      });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });
  });
});
