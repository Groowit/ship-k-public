import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminProductEditor } from "./admin-product-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh
  })
}));

describe("AdminProductEditor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    push.mockClear();
    refresh.mockClear();
  });

  it("adds structured rows and reflects edits in the live preview immediately", () => {
    render(<AdminProductEditor mode="create" />);

    fireEvent.change(screen.getByLabelText("상품명"), {
      target: { value: "Rice Calm Cream" }
    });
    expect(screen.getByRole("heading", { name: "Rice Calm Cream" })).toBeVisible();

    fireEvent.click(screen.getByTestId("add-included-items"));
    expect(screen.getByText("구성품 1")).toBeVisible();
    expect(screen.getByRole("heading", { name: "구성품명 미입력" })).toBeVisible();

    fireEvent.change(screen.getByLabelText("구성품명"), {
      target: { value: "Rice Calm Cream" }
    });
    fireEvent.change(screen.getByLabelText("구성품 유형"), {
      target: { value: "Skincare" }
    });
    fireEvent.change(screen.getByLabelText("사용 메모"), {
      target: { value: "A calm moisturizing step." }
    });

    expect(screen.getByRole("heading", { name: "Rice Calm Cream", level: 3 })).toBeVisible();
    expect(screen.getByText("Skincare")).toBeVisible();
    expect(screen.getAllByText("A calm moisturizing step.").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByTestId("add-routine-steps"));
    expect(screen.getByText("루틴 단계 1")).toBeVisible();
    expect(screen.getByText("단계명 미입력")).toBeVisible();

    fireEvent.change(screen.getByLabelText("단계명"), {
      target: { value: "Apply cream" }
    });
    fireEvent.change(screen.getByLabelText("수행 방법"), {
      target: { value: "Apply after serum." }
    });

    expect(screen.getByText("Apply cream")).toBeVisible();
    expect(screen.getByText("Apply after serum.")).toBeVisible();

    fireEvent.click(screen.getByTestId("add-detail-images"));
    expect(screen.getAllByText("상세 이미지 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByAltText("Rice Calm Cream 상세 이미지 1")).toBeVisible();

    fireEvent.click(screen.getByTestId("add-content-blocks"));
    fireEvent.change(screen.getByLabelText("콘텐츠 제목"), {
      target: { value: "Texture close-up" }
    });
    fireEvent.change(screen.getByLabelText("본문"), {
      target: { value: "A soft gel cream texture with a dewy finish." }
    });

    expect(screen.getByRole("heading", { name: "Texture close-up" })).toBeVisible();
    expect(screen.getAllByText("A soft gel cream texture with a dewy finish.").length).toBeGreaterThanOrEqual(1);
  });

  it("does not send untouched blank structured rows in the draft payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "draft-1", name: "Draft Product" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="create" />);

    fireEvent.change(screen.getByLabelText("상품명"), {
      target: { value: "Draft Product" }
    });
    fireEvent.click(screen.getByTestId("add-included-items"));
    fireEvent.click(screen.getByTestId("add-routine-steps"));
    fireEvent.click(screen.getByTestId("add-detail-images"));
    fireEvent.click(screen.getByTestId("add-content-blocks"));

    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(body.includedItems).toEqual([]);
    expect(body.routineSteps).toEqual([]);
    expect(body.contentBlocks).toEqual([]);
    expect(push).toHaveBeenCalledWith("/admin/products/draft-1");
  });
});
