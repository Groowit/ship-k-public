import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const supabaseMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithIdToken: vi.fn(),
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
      signInWithIdToken: supabaseMocks.signInWithIdToken,
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

vi.mock("@/components/google-identity-button", async () => {
  const React = await import("react");

  return {
    GoogleIdentityButton: ({
      mode,
      disabled,
      onCredential
    }: {
      mode: "sign-in" | "sign-up";
      disabled?: boolean;
      onCredential: (response: { credential: string }, nonce: string) => void;
    }) =>
      React.createElement(
        "button",
        {
          disabled,
          onClick: () => onCredential({ credential: "google-id-token" }, "nonce")
        },
        mode === "sign-up" ? "Sign up with Google" : "Sign in with Google"
      )
  };
});

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

    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));

    expect(screen.getByLabelText(/I agree to the Terms/i)).toBeVisible();
    expect(screen.getByLabelText(/Send me product drops/i)).toBeVisible();
  });

  it("can start directly in account creation mode", () => {
    render(<AuthForm initialMode="sign-up" />);

    expect(screen.getByText("Create your shipK account")).toBeVisible();
    expect(screen.getByLabelText(/I agree to the Terms/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  it("signs in with a Google ID token instead of hosted Supabase OAuth", async () => {
    supabaseMocks.signInWithIdToken.mockResolvedValue({
      data: { session: { access_token: "token" }, user: { id: "user-id" } },
      error: null
    });
    render(<AuthForm nextPath="/checkout?product=skincare-starter-set" />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() =>
      expect(supabaseMocks.signInWithIdToken).toHaveBeenCalledTimes(1)
    );
    expect(supabaseMocks.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-id-token",
      nonce: "nonce"
    });
    expect(supabaseMocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("blocks Google sign-up until required consent is accepted", async () => {
    render(<AuthForm initialMode="sign-up" />);

    fireEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Please accept the Terms and Privacy Policy to create an account."
    );
    expect(supabaseMocks.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("allows Google sign-up after required consent is accepted", async () => {
    supabaseMocks.signInWithIdToken.mockResolvedValue({
      data: { session: { access_token: "token" }, user: { id: "user-id" } },
      error: null
    });
    render(<AuthForm initialMode="sign-up" />);

    fireEvent.click(screen.getByLabelText(/I agree to the Terms/i));
    fireEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));

    await waitFor(() =>
      expect(supabaseMocks.signInWithIdToken).toHaveBeenCalledTimes(1)
    );
    expect(supabaseMocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        marketing_opt_in: false
      })
    );
  });
});
