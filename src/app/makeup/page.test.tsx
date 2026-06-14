import { describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound
}));

describe("MakeupPage", () => {
  it("returns 404 so the removed Makeup catalog cannot be entered directly", async () => {
    const { default: MakeupPage } = await import("./page");

    expect(() => MakeupPage()).toThrow("NEXT_NOT_FOUND");
    expect(navigationMocks.notFound).toHaveBeenCalledOnce();
  });
});
