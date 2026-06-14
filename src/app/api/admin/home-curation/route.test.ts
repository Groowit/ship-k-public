import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import {
  HomeCurationDuplicateProductError,
  HomeCurationOrderError,
  HomeCurationSetupRequiredError,
  createHomeCurationEntry,
  deleteHomeCurationEntry,
  listAdminHomeCurationEntries,
  reorderHomeCurationEntries
} from "@/lib/home-curation";
import { DELETE } from "./[id]/route";
import { GET, POST } from "./route";
import { PATCH as PATCH_REORDER } from "./reorder/route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/home-curation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/home-curation")>("@/lib/home-curation");
  return {
    ...actual,
    createHomeCurationEntry: vi.fn(),
    deleteHomeCurationEntry: vi.fn(),
    listAdminHomeCurationEntries: vi.fn(),
    reorderHomeCurationEntries: vi.fn()
  };
});

const entry = {
  id: "entry_1",
  productId: "product_1",
  sortOrder: 1,
  nonVisibleReasons: [],
  product: {
    id: "product_1",
    slug: "glow",
    name: "Glow",
    status: "active",
    option: { stockQuantity: 10 }
  }
};

describe("admin home curation API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(listAdminHomeCurationEntries).mockResolvedValue([entry] as never);
    vi.mocked(createHomeCurationEntry).mockResolvedValue([entry] as never);
    vi.mocked(deleteHomeCurationEntry).mockResolvedValue([] as never);
    vi.mocked(reorderHomeCurationEntries).mockResolvedValue([entry] as never);
  });

  it("blocks unauthenticated curation list requests", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AuthRequiredError());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listAdminHomeCurationEntries).not.toHaveBeenCalled();
  });

  it("returns setup-required when the curation table is missing", async () => {
    vi.mocked(listAdminHomeCurationEntries).mockRejectedValue(new HomeCurationSetupRequiredError());

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/Home curation table is not ready/);
  });

  it("creates curation entries through the admin store", async () => {
    const response = await POST(jsonRequest({ productId: "product_1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toEqual([entry]);
    expect(createHomeCurationEntry).toHaveBeenCalledWith({ productId: "product_1" });
  });

  it("returns duplicate product errors as conflicts", async () => {
    vi.mocked(createHomeCurationEntry).mockRejectedValue(new HomeCurationDuplicateProductError());

    const response = await POST(jsonRequest({ productId: "product_1" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/already curated/);
  });

  it("deletes a selected curation entry", async () => {
    const response = await DELETE(new Request("http://test.local/api/admin/home-curation/entry_1"), {
      params: Promise.resolve({ id: "entry_1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(deleteHomeCurationEntry).toHaveBeenCalledWith("entry_1");
  });

  it("reorders curation entries", async () => {
    const response = await PATCH_REORDER(jsonRequest({ ids: ["entry_1"] }));

    expect(response.status).toBe(200);
    expect(reorderHomeCurationEntries).toHaveBeenCalledWith(["entry_1"]);
  });

  it("returns reorder validation errors as bad requests", async () => {
    vi.mocked(reorderHomeCurationEntries).mockRejectedValue(
      new HomeCurationOrderError("Curation reorder payload contains duplicates")
    );

    const response = await PATCH_REORDER(jsonRequest({ ids: ["entry_1", "entry_1"] }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/duplicates/);
  });

  it("blocks unsafe origins before create, delete, and reorder work", async () => {
    const headers = { origin: "https://evil.test" };

    const createResponse = await POST(jsonRequest({ productId: "product_1" }, headers));
    const deleteResponse = await DELETE(
      new Request("http://test.local/api/admin/home-curation/entry_1", { headers }),
      { params: Promise.resolve({ id: "entry_1" }) }
    );
    const reorderResponse = await PATCH_REORDER(jsonRequest({ ids: ["entry_1"] }, headers));

    expect(createResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(reorderResponse.status).toBe(403);
    expect(requireCurrentAdmin).not.toHaveBeenCalled();
    expect(createHomeCurationEntry).not.toHaveBeenCalled();
    expect(deleteHomeCurationEntry).not.toHaveBeenCalled();
    expect(reorderHomeCurationEntries).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://test.local/api/admin/home-curation", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}
