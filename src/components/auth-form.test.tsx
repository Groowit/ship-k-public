import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const supabaseMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  eq: vi.fn(),
  update: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithOAuth: supabaseMocks.signInWithOAuth,
      signInWithPassword: supabaseMocks.signInWithPassword,
      signUp: supabaseMocks.signUp
    },
    from: () => ({
      update: supabaseMocks.update.mockReturnValue({
        eq: supabaseMocks.eq
      })
    })
  })
}));

describe("AuthForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not show consent checkboxes in sign-in mode", () => {
    render(<AuthForm />);

    expect(
      screen.queryByLabelText(/I agree to the Terms/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Send me product drops/i)
    ).not.toBeInTheDocument();
  });

  it("shows consent checkboxes only after switching to account creation", () => {
    render(<AuthForm />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to create account" }));

    expect(screen.getByLabelText(/I agree to the Terms/i)).toBeVisible();
    expect(screen.getByLabelText(/Send me product drops/i)).toBeVisible();
  });

  it("can start directly in account creation mode", () => {
    render(<AuthForm initialMode="sign-up" />);

    expect(screen.getByText("Create your shipK account")).toBeVisible();
    expect(screen.getByLabelText(/I agree to the Terms/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  it("starts Google OAuth with the safe callback redirect", async () => {
    supabaseMocks.signInWithOAuth.mockResolvedValue({ error: null });

    render(<AuthForm nextPath="/checkout?product=daily-k-glow-set" />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(supabaseMocks.signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(supabaseMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining(
          "/auth/callback?next=%2Fcheckout%3Fproduct%3Ddaily-k-glow-set"
        )
      }
    });
  });
});
