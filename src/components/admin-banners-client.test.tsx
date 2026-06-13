/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { AdminBannersClient } from "./admin-banners-client";
import type { HomeBanner } from "@/lib/home-banners";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => {
    void _fill;
    return <img alt={alt ?? ""} data-unoptimized={unoptimized ? "true" : "false"} {...props} />;
  }
}));

describe("AdminBannersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("creates a banner without a side image", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ banner: bannerFixture() }));

    render(<AdminBannersClient initialBanners={[]} />);

    fireEvent.change(screen.getByLabelText("토픽"), { target: { value: "TODAY" } });
    fireEvent.change(screen.getByLabelText("큰 글"), { target: { value: "Managed banner" } });
    fireEvent.change(screen.getByLabelText("작은 설명글"), { target: { value: "Admin controlled copy" } });
    fireEvent.change(screen.getByLabelText("배너 배경 사진"), { target: { value: "/background.png" } });
    fireEvent.change(screen.getByLabelText("링크"), { target: { value: "/shop" } });
    fireEvent.click(screen.getByLabelText("토픽 색상 shipK 핑크"));
    fireEvent.click(screen.getByLabelText("큰 글 색상 화이트"));
    fireEvent.click(screen.getByLabelText("작은 설명글 색상 틸"));
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("배너를 등록했습니다."));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/banners",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({
      topicTextColor: "shipk-pink",
      headlineTextColor: "white",
      descriptionTextColor: "teal"
    });
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).not.toHaveProperty(
      "sideImagePath"
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("creates an image-only banner without topic, headline, or description", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ banner: bannerFixture({ topic: "", headline: "", description: "" }) })
    );

    render(<AdminBannersClient initialBanners={[]} />);

    fireEvent.change(screen.getByLabelText("배너 배경 사진"), { target: { value: "/image-only.png" } });
    fireEvent.change(screen.getByLabelText("링크"), { target: { value: "/shop" } });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("배너를 등록했습니다."));
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({
      topic: "",
      headline: "",
      description: "",
      backgroundImagePath: "/image-only.png",
      linkPath: "/shop"
    });
  });

  it("updates and deletes the selected banner", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ banner: { ...bannerFixture(), headline: "Updated banner" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, banners: [] }));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminBannersClient initialBanners={[bannerFixture()]} />);

    fireEvent.change(screen.getByLabelText("큰 글"), { target: { value: "Updated banner" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("배너를 저장했습니다."));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/banners/banner_1",
      expect.objectContaining({ method: "PATCH" })
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("배너를 삭제했습니다."));
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/banners/banner_1", { method: "DELETE" });
    expect(screen.getByText("등록된 홈 배너가 없습니다.")).toBeVisible();
  });

  it("saves reordered banner ids", async () => {
    const first = bannerFixture({ id: "banner_1", headline: "First", sortOrder: 1 });
    const second = bannerFixture({ id: "banner_2", headline: "Second", sortOrder: 2 });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ banners: [second, first] }));

    render(<AdminBannersClient initialBanners={[first, second]} />);

    fireEvent.click(screen.getByRole("button", { name: "Second 위로 이동" }));

    await waitFor(() => expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("배너 순서를 저장했습니다."));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/banners/reorder",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ ids: ["banner_2", "banner_1"] })
      })
    );
  });

  it("uploads side images independently from required background images", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ publicUrl: "https://cdn.ship-k.test/side.png" }));
    render(<AdminBannersClient initialBanners={[]} />);

    const input = screen.getByLabelText("보조 상품 사진").parentElement?.querySelector("input[type='file']");
    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["image"], "side.png", { type: "image/png" })]
      }
    });

    await waitFor(() => expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("보조 상품 사진을 업로드했습니다."));
    expect(screen.getByLabelText("보조 상품 사진")).toHaveValue("https://cdn.ship-k.test/side.png");
  });

  it("shows unsaved upload state and blocks external links before submitting", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ publicUrl: "https://cdn.ship-k.test/background.png" }));
    render(<AdminBannersClient initialBanners={[]} />);

    const input = screen.getByLabelText("배너 배경 사진").parentElement?.querySelector("input[type='file']");
    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["image"], "background.png", { type: "image/png" })]
      }
    });

    await waitFor(() =>
      expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("저장하면 홈에 바로 반영됩니다.")
    );
    expect(screen.getByText("저장되지 않은 변경사항이 있습니다.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("토픽"), { target: { value: "TODAY" } });
    fireEvent.change(screen.getByLabelText("큰 글"), { target: { value: "Managed banner" } });
    fireEvent.change(screen.getByLabelText("작은 설명글"), { target: { value: "Admin controlled copy" } });
    fireEvent.change(screen.getByLabelText("링크"), { target: { value: "https://example.com/banner" } });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => expect(screen.getByTestId("admin-banner-message")).toHaveTextContent("내부 경로만"));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function bannerFixture(overrides: Partial<HomeBanner> = {}): HomeBanner {
  return {
    id: "banner_1",
    topic: "TODAY",
    headline: "Managed banner",
    description: "Admin controlled copy",
    backgroundImagePath: "/background.png",
    linkPath: "/shop",
    fontKey: "brand-display",
    textColor: "black",
    topicTextColor: "black",
    headlineTextColor: "black",
    descriptionTextColor: "black",
    sortOrder: 1,
    ...overrides
  };
}
