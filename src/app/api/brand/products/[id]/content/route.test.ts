import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import {
  BrandAccessDeniedError,
  BrandProductNotFoundError,
  updateBrandProductContentForUser
} from "@/lib/brand-store";
import { PATCH } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentUser: vi.fn()
  };
});

vi.mock("@/lib/brand-store", () => ({
  BrandAccessDeniedError: class BrandAccessDeniedError extends Error {
    status = 403;
  },
  BrandInputError: class BrandInputError extends Error {
    status = 400;
  },
  BrandProductNotFoundError: class BrandProductNotFoundError extends Error {
    status = 404;
  },
  updateBrandProductContentForUser: vi.fn()
}));

describe("brand product content API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "brand_member_1" } as never,
      profile: null
    });
    vi.mocked(updateBrandProductContentForUser).mockResolvedValue({
      id: "product_1",
      name: "Glow Set"
    } as never);
  });

  it("blocks unauthenticated content updates before touching product storage", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await PATCH(jsonRequest(validPayload()), {
      params: Promise.resolve({ id: "product_1" })
    });

    expect(response.status).toBe(401);
    expect(updateBrandProductContentForUser).not.toHaveBeenCalled();
  });

  it("returns forbidden for signed-in customers without brand membership", async () => {
    vi.mocked(updateBrandProductContentForUser).mockRejectedValue(
      new BrandAccessDeniedError("Brand access required")
    );

    const response = await PATCH(jsonRequest(validPayload()), {
      params: Promise.resolve({ id: "product_1" })
    });

    expect(response.status).toBe(403);
  });

  it("does not reveal wrong-brand product access", async () => {
    vi.mocked(updateBrandProductContentForUser).mockRejectedValue(
      new BrandProductNotFoundError("Brand product not found")
    );

    const response = await PATCH(jsonRequest(validPayload()), {
      params: Promise.resolve({ id: "product_2" })
    });

    expect(response.status).toBe(404);
  });

  it("rejects commerce fields in brand updates", async () => {
    const response = await PATCH(
      jsonRequest({
        ...validPayload(),
        priceUsd: 19,
        stockQuantity: 8,
        status: "active"
      }),
      { params: Promise.resolve({ id: "product_1" }) }
    );

    expect(response.status).toBe(400);
    expect(updateBrandProductContentForUser).not.toHaveBeenCalled();
  });

  it("updates assigned product detail content for a brand member", async () => {
    const response = await PATCH(jsonRequest(validPayload()), {
      params: Promise.resolve({ id: "product_1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product).toMatchObject({ id: "product_1" });
    expect(updateBrandProductContentForUser).toHaveBeenCalledWith({
      userId: "brand_member_1",
      productId: "product_1",
      input: expect.objectContaining({
        sections: expect.arrayContaining([
          expect.objectContaining({
            sectionType: "text",
            body: "브랜드 상세 본문"
          })
        ])
      })
    });
  });
});

function validPayload() {
  return {
    sections: [
      {
        sectionType: "heading",
        schemaVersion: 1,
        text: "브랜드 상세 요약",
        level: "h2",
        align: "left"
      },
      {
        sectionType: "text",
        schemaVersion: 1,
        body: "브랜드 상세 본문",
        align: "left"
      }
    ]
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/brand/products/product_1/content", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
