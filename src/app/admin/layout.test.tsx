import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";
import { getCurrentAuthState } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  getCurrentAuthState: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn()
}));

describe("AdminLayout", () => {
  it("exposes home curation management in the admin navigation", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "admin_1", email: "admin@ship-k.test" },
      profile: { role: "admin", email: "admin@ship-k.test" }
    } as never);

    render(await AdminLayout({ children: <div>Admin child</div> }));

    const link = screen.getByRole("link", { name: "홈 큐레이션" });
    expect(link).toHaveAttribute("href", "/admin/home-curation");
  });
});
