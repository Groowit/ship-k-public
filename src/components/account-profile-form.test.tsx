import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountProfileForm } from "./account-profile-form";

describe("AccountProfileForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders profile and default shipping values, then posts updates", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response);

    render(
      <AccountProfileForm
        profile={{
          email: "jamie@example.com",
          fullName: "Jamie Park",
          phone: "2135550144",
          marketingOptIn: false,
          defaultShippingAddress: {
            name: "Jamie Park",
            phone: "2135550144",
            address1: "123 Ocean Ave",
            address2: "",
            city: "Los Angeles",
            state: "CA",
            postalCode: "90001",
            country: "US",
            memo: ""
          }
        }}
      />
    );

    expect(screen.getByLabelText("Email")).toHaveValue("jamie@example.com");
    expect(screen.getByLabelText("Full name")).toHaveValue("Jamie Park");
    expect(screen.getByLabelText("Address line 1")).toHaveValue("123 Ocean Ave");

    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "3105550199" }
    });
    fireEvent.change(screen.getByLabelText("ZIP code"), {
      target: { value: "90002" }
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Email updates/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save account details" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/profile",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"phone":"3105550199"')
      })
    );
    expect(fetchMock.mock.calls[0][1]?.body).toEqual(
      expect.stringContaining('"postalCode":"90002"')
    );
    expect(await screen.findByText("Account details saved.")).toBeVisible();
  });
});
