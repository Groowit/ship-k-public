import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleIdentityButton } from "./google-identity-button";

describe("GoogleIdentityButton", () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalClientId;
    vi.clearAllMocks();
  });

  it("keeps a Google button visible when Google Identity cannot render", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "";
    const onError = vi.fn();

    render(
      <GoogleIdentityButton
        mode="sign-in"
        onCredential={vi.fn()}
        onError={onError}
      />
    );

    const button = await screen.findByRole("button", { name: "Sign in with Google" });

    expect(button).toBeVisible();

    fireEvent.click(button);

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Google sign-in is not configured."
        })
      )
    );
  });
});
