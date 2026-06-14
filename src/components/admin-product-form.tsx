"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  ChevronDown,
  Columns2,
  DollarSign,
  Eye,
  FileImage,
  GripVertical,
  Heading2,
  ImageIcon,
  ImagePlus,
  Images,
  ListChecks,
  ListPlus,
  MessageSquareText,
  PackageCheck,
  PanelRightOpen,
  PencilLine,
  Plus,
  Save,
  Settings2,
  Store,
  Trash2,
  Type,
  Video,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyProductDisclosureNotes,
  getIncompleteProductDisclosureFields,
  hasCompleteProductDisclosureNotes,
  normalizeProductDisclosureNotes,
  productDisclosureSections,
  type ProductDisclosureNotes,
  type ProductDisclosureSectionId
} from "@/lib/product-disclosure-notes";
import {
  createDefaultDetailSections,
  productDetailSectionSchemaVersion,
  type ProductDetailSection,
  type ProductDetailSectionInput
} from "@/lib/product-detail-sections";
import type { BrandPartnerOption, ProductBrandAssignment } from "@/lib/brand-store";
import {
  Product,
  ProductCategory,
  ProductContentBlock,
  ProductGalleryImage,
  ProductIncludedItem,
  ProductRoutineStep,
  ProductStatus,
  productCategories
} from "@/lib/products";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";
type PreviewTab = "edit" | "preview";
type SectionType = ProductDetailSectionInput["sectionType"];

type GalleryDraft = Omit<ProductGalleryImage, "id">;
type IncludedItemDraft = Omit<ProductIncludedItem, "id">;
type RoutineStepDraft = Omit<ProductRoutineStep, "id">;
type DetailImageDraft = {
  imagePath: string;
  alt: string;
};
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
type ContentBlockDraft = WithoutId<ProductContentBlock>;
type DetailSectionDraft = ProductDetailSectionInput & {
  id: string;
  sortOrder: number;
};

type EditorState = {
  productType: Product["productType"];
  brandName: string;
  brandPartnerId: string;
  canEditDetails: boolean;
  name: string;
  category: ProductCategory;
  tagsText: string;
  difficulty: Product["difficulty"];
  itemCount: string;
  shortDescription: string;
  description: string;
  bestFor: string;
  result: string;
  optionName: string;
  sku: string;
  priceUsd: string;
  stockQuantity: string;
  heroImagePath: string;
  introVideoUrl: string;
  galleryImages: GalleryDraft[];
  includedItems: IncludedItemDraft[];
  routineSteps: RoutineStepDraft[];
  detailImages: DetailImageDraft[];
  contentBlocks: ContentBlockDraft[];
  disclosureNotes: ProductDisclosureNotes;
  detailSections: DetailSectionDraft[];
};

const sectionPalette: Array<{
  type: SectionType;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Heading2;
}> = [
  { type: "heading", label: "제목", shortLabel: "제목", description: "상세 페이지의 큰 구간을 나눕니다.", icon: Heading2 },
  { type: "text", label: "문단", shortLabel: "문단", description: "제품 스토리나 설명을 길게 씁니다.", icon: Type },
  { type: "image", label: "사진", shortLabel: "사진", description: "제품 이미지를 단독으로 배치합니다.", icon: ImageIcon },
  {
    type: "long_detail_image",
    label: "긴 상세 이미지",
    shortLabel: "긴 이미지",
    description: "외부 에디터에서 만든 세로 상세 이미지를 넣습니다.",
    icon: FileImage
  },
  { type: "image_text", label: "사진+설명", shortLabel: "사진+글", description: "이미지와 설명을 좌우로 배치합니다.", icon: Columns2 },
  { type: "image_group", label: "사진 모음", shortLabel: "모음", description: "여러 이미지를 묶어 보여줍니다.", icon: Images },
  { type: "video", label: "영상", shortLabel: "영상", description: "YouTube/Vimeo 임베드 영상을 넣습니다.", icon: Video },
  { type: "comparison", label: "비교/FAQ", shortLabel: "비교", description: "성분, 장점, FAQ를 카드로 정리합니다.", icon: MessageSquareText },
  { type: "steps", label: "단계", shortLabel: "단계", description: "사용법이나 진행 순서를 단계별로 씁니다.", icon: ListChecks },
  { type: "notice", label: "안내 박스", shortLabel: "안내", description: "주의사항이나 팁을 강조합니다.", icon: MessageSquareText }
];

const sectionLabels: Record<SectionType, string> = Object.fromEntries(
  sectionPalette.map((item) => [item.type, item.label])
) as Record<SectionType, string>;

const headingSizeOptions: Array<[string, string]> = [
  ["medium", "중간"],
  ["large", "큼"],
  ["display", "아주 큼"],
  ["hero", "히어로"]
];
const bodySizeOptions: Array<[string, string]> = [
  ["small", "작게"],
  ["base", "기본"],
  ["large", "큼"],
  ["xlarge", "아주 큼"]
];
const fontWeightOptions: Array<[string, string]> = [
  ["regular", "보통"],
  ["medium", "중간"],
  ["bold", "굵게"],
  ["black", "매우 굵게"]
];
const stepsLayoutOptions: Array<[string, string]> = [
  ["split_cards", "제목 왼쪽 + 카드"],
  ["full_cards", "전체 카드"],
  ["timeline", "세로 타임라인"],
  ["simple_list", "간단 목록"]
];
const imageFitOptions: Array<[string, string]> = [
  ["cover", "프레임 채우기"],
  ["contain", "전체 맞춤"]
];
const textColorOptions = [
  { value: "default", label: "기본", color: "#0a0a0a" },
  { value: "muted", label: "회색", color: "#6b7280" },
  { value: "pink", label: "핑크", color: "#ff3d7f" },
  { value: "blue", label: "블루", color: "#246bfe" },
  { value: "mint", label: "민트", color: "#0f766e" },
  { value: "coral", label: "코랄", color: "#f97316" }
];

const emptyIncludedItem: IncludedItemDraft = {
  name: "",
  category: "",
  description: ""
};

const emptyRoutineStep: RoutineStepDraft = {
  title: "",
  body: ""
};

const emptyGalleryImage: GalleryDraft = {
  imagePath: "",
  altText: ""
};

const emptyDetailImage: DetailImageDraft = {
  imagePath: "",
  alt: ""
};

export function AdminProductEditor({
  mode,
  product,
  brandOptions = [],
  currentBrandAssignment = null
}: {
  mode: "create" | "edit";
  product?: Product;
  brandOptions?: BrandPartnerOption[];
  currentBrandAssignment?: ProductBrandAssignment | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<EditorState>(() => createInitialState(product, currentBrandAssignment));
  const [currentProduct, setCurrentProduct] = useState<Product | undefined>(product);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("edit");
  const brandSelectOptions = useMemo(() => {
    const options = [...brandOptions];
    const assignedBrand = currentBrandAssignment?.brand;

    if (assignedBrand && !options.some((brand) => brand.id === assignedBrand.id)) {
      options.unshift(assignedBrand);
    }

    return options;
  }, [brandOptions, currentBrandAssignment]);
  const previewProduct = useMemo(() => toPreviewProduct(state, currentProduct), [state, currentProduct]);
  const readinessChecks = useMemo(() => getPublishReadinessChecks(state), [state]);

  useEffect(() => {
    setCurrentProduct(product);
    setState(createInitialState(product, currentBrandAssignment));
    setSaveState("idle");
    setMessage(null);
    setPreviewTab("edit");
  }, [mode, product, currentBrandAssignment]);

  async function saveProduct(status: ProductStatus) {
    setSaveState("saving");
    setMessage(null);

    try {
      const productId = currentProduct?.id ?? product?.id;

      if (mode === "edit" && !productId) {
        throw new Error("수정할 상품을 찾지 못했습니다. 상품 목록에서 다시 진입해주세요.");
      }

      const response = await fetch(
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(state, status))
        }
      );
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "상품을 저장하지 못했습니다.");
      }

      const savedProduct = body.product;
      setSaveState("saved");
      setMessage(
        status === "active"
          ? `${savedProduct?.name ?? state.name} 상품을 판매중으로 발행했습니다.`
          : `${savedProduct?.name ?? state.name} 상품을 임시저장했습니다.`
      );

      if (mode === "create") {
        router.push(`/admin/products/${savedProduct.id}`);
      } else {
        if (isHydratableProduct(savedProduct)) {
          setCurrentProduct(savedProduct);
          const nextState = createInitialState(savedProduct, currentBrandAssignment);
          nextState.brandPartnerId = state.brandPartnerId;
          nextState.canEditDetails = state.canEditDetails;
          setState(nextState);
        }
        router.refresh();
      }
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "상품을 저장하지 못했습니다.");
    }
  }

  async function hideCurrentProduct() {
    const productToArchive = currentProduct ?? product;

    if (!productToArchive || !window.confirm("이 상품을 숨길까요? 공개 상품 목록에서는 숨겨집니다.")) {
      return;
    }

    setSaveState("saving");
    setMessage(null);
    const response = await fetch(`/api/admin/products/${productToArchive.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" })
    });
    const body = await response.json();

    if (!response.ok) {
      setSaveState("error");
      setMessage(body.error ?? "상품을 숨기지 못했습니다.");
      return;
    }

    router.push("/admin/products");
  }

  if (previewTab === "preview") {
    return (
      <div className="grid gap-4 pb-32">
        <div className="sticky top-0 z-30 rounded-md border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">관리자 공개 화면 미리보기</p>
              <p className="text-xs text-muted-foreground">저장 전 편집본 기준으로 상품 상세 페이지 전체를 확인합니다.</p>
            </div>
            <span className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
              {getStatusLabel(product?.status ?? "draft")}
            </span>
          </div>
          {message ? (
            <p
              role="status"
              className={cn(
                "mt-3 rounded-md p-3 text-sm",
                saveState === "error" ? "bg-destructive/10 text-destructive" : "bg-muted"
              )}
              data-testid="admin-product-message"
            >
              {message}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-md border bg-background">
          <ProductDetailView product={previewProduct} isAuthenticated previewMode />
        </div>

        <AdminProductActionBar
          mode={previewTab}
          productStatus={currentProduct?.status ?? "draft"}
          saveState={saveState}
          canArchive={mode === "edit" && Boolean(currentProduct?.id)}
          onSaveDraft={() => saveProduct("draft")}
          onPublish={() => saveProduct("active")}
          onPreview={() => setPreviewTab("preview")}
          onBackToEdit={() => setPreviewTab("edit")}
          onArchive={hideCurrentProduct}
          onCancel={() => router.push("/admin/products")}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 pb-32">
      <section className="rounded-md border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">관리자 상품 관리</p>
            <h2 className="text-2xl font-bold tracking-normal">
              {mode === "create" ? "새 상품 작성" : "상품 수정 및 발행"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              판매 정보, 가격/재고, 미디어, 상세 문서를 한 흐름에서 작성하고 미리보기로 확인한 뒤 발행합니다.
            </p>
            {currentProduct?.id ? (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                상품 ID: {currentProduct.id}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#admin-product-operations"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3 text-sm")}
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              운영 설정
            </a>
            <a
              href="#admin-product-story"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3 text-sm")}
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              상세 스토리
            </a>
            <Link
              href="/admin/products"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3 text-sm")}
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              상품 목록
            </Link>
            <span className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
              {getStatusLabel(currentProduct?.status ?? "draft")}
            </span>
            <span className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
              {state.detailSections.length}개 상세 섹션
            </span>
          </div>
        </div>
        {message ? (
          <p
            role="status"
            className={cn(
              "mt-4 rounded-md p-3 text-sm",
              saveState === "error" ? "bg-destructive/10 text-destructive" : "bg-muted"
            )}
            data-testid="admin-product-message"
          >
            {message}
          </p>
        ) : null}
      </section>

      <div id="admin-product-operations" className="scroll-mt-24 grid gap-5">
        <section className="rounded-md border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">운영자 전용</p>
              <h3 className="text-xl font-bold">운영 상품 설정</h3>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                브랜드파트너가 수정하는 상세 스토리와 별개로 판매 정보, 대표 미디어, 브랜드 포털 연결을
                확정합니다.
              </p>
            </div>
            <span className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
              {mode === "create" ? "신규 등록" : "수정 모드"}
            </span>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="상품 유형">
              <select
                aria-label="상품 유형"
                value={state.productType}
                onChange={(event) => updateField(setState, "productType", event.target.value as Product["productType"])}
                className="h-11 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="set">세트 상품</option>
                <option value="single">단품 상품</option>
              </select>
            </Field>
            <Field label="상품 표시 브랜드명">
              <Input
                aria-label="상품 표시 브랜드명"
                value={state.brandName}
                onChange={(event) => updateField(setState, "brandName", event.target.value)}
                required
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                상품 카드와 상세 페이지에 표시되는 카탈로그 이름입니다.
              </p>
            </Field>
            <Field label="상품명">
              <Input
                aria-label="상품명"
                value={state.name}
                onChange={(event) => updateField(setState, "name", event.target.value)}
                required
              />
            </Field>
            <Field label="카테고리">
              <select
                aria-label="카테고리"
                value={state.category}
                onChange={(event) => updateField(setState, "category", event.target.value as ProductCategory)}
                className="h-11 w-full rounded-md border bg-white px-3 text-sm"
                required
              >
                {productCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="상품 태그">
              <Input
                aria-label="상품 태그"
                value={state.tagsText}
                onChange={(event) => updateField(setState, "tagsText", event.target.value)}
                placeholder="TONER PAD, HYDRATION, QUICK PREP"
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                카드 좌측 하단과 상세 상단에 보이는 짧은 상품 특성입니다. 신상품/베스트셀러 배지는 주문과 등록일 기준으로 자동 표시됩니다.
              </p>
            </Field>
            <Field label="난이도">
              <select
                aria-label="난이도"
                value={state.difficulty ?? "Beginner"}
                onChange={(event) => updateField(setState, "difficulty", event.target.value as Product["difficulty"])}
                className="h-11 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="Beginner">초급</option>
                <option value="Intermediate">중급</option>
              </select>
            </Field>
            <Field label="구성 수">
              <Input
                aria-label="구성 수"
                value={state.itemCount}
                onChange={(event) => updateField(setState, "itemCount", event.target.value)}
                type="number"
                min="1"
                max="20"
              />
            </Field>
            <Field label="짧은 설명" className="md:col-span-2">
              <Input
                aria-label="짧은 설명"
                value={state.shortDescription}
                onChange={(event) => updateField(setState, "shortDescription", event.target.value)}
                required
              />
            </Field>
            <Field label="상품 소개" className="md:col-span-2">
              <Textarea
                aria-label="상품 소개"
                value={state.description}
                onChange={(event) => updateField(setState, "description", event.target.value)}
                required
                rows={4}
              />
            </Field>
            <Field label="추천 상황" className="md:col-span-2">
              <Input
                aria-label="추천 상황"
                value={state.bestFor}
                onChange={(event) => updateField(setState, "bestFor", event.target.value)}
              />
            </Field>
            <Field label="기대 결과" className="md:col-span-2">
              <Input
                aria-label="기대 결과"
                value={state.result}
                onChange={(event) => updateField(setState, "result", event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle>브랜드 포털 연결</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="브랜드 파트너">
                <select
                  aria-label="브랜드 파트너"
                  value={state.brandPartnerId}
                  onChange={(event) => updateField(setState, "brandPartnerId", event.target.value)}
                  className="h-11 w-full rounded-md border bg-white px-3 text-sm"
                >
                  <option value="">연결하지 않음</option>
                  {brandSelectOptions.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name} / {brand.slug}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  선택한 브랜드 파트너의 활성 멤버에게 이 상품이 표시됩니다.
                </p>
              </Field>
              <Field label="브랜드 상세 권한">
                <label
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
                    !state.brandPartnerId && "bg-muted text-muted-foreground"
                  )}
                >
                  <input
                    aria-label="상세 편집 허용"
                    type="checkbox"
                    checked={state.canEditDetails}
                    disabled={!state.brandPartnerId}
                    onChange={(event) => updateField(setState, "canEditDetails", event.target.checked)}
                  />
                  상세 편집 허용
                </label>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  꺼두면 브랜드 포털에서 상품은 보이지만 상세 스토리는 수정할 수 없습니다.
                </p>
              </Field>
              <div className="rounded-md border bg-muted p-3 text-sm md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
                    <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">
                      {brandSelectOptions.length ? "브랜드 파트너는 기존 항목만 연결합니다." : "활성 브랜드 파트너가 없습니다."}
                    </span>
                  </span>
                  <Link
                    href="/admin/brands"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-white")}
                  >
                    브랜드 파트너 관리
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>가격</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="옵션명">
                <Input
                  aria-label="옵션명"
                  value={state.optionName}
                  onChange={(event) => updateField(setState, "optionName", event.target.value)}
                />
              </Field>
              <Field label="SKU">
                <Input
                  aria-label="SKU"
                  value={state.sku}
                  onChange={(event) => updateField(setState, "sku", event.target.value)}
                />
              </Field>
              <Field label="가격 USD">
                <Input
                  aria-label="가격 USD"
                  value={state.priceUsd}
                  onChange={(event) => updateField(setState, "priceUsd", event.target.value)}
                  type="number"
                  min="1"
                  step="0.01"
                  required
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>재고</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="재고 수량">
                <Input
                  aria-label="재고 수량"
                  value={state.stockQuantity}
                  onChange={(event) => updateField(setState, "stockQuantity", event.target.value)}
                  type="number"
                  min="0"
                  required
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>미디어</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <ImagePathField
                label="대표 이미지"
                value={state.heroImagePath}
                onChange={(value) => updateField(setState, "heroImagePath", value)}
              />
              <Field label="인트로 영상 URL">
                <Input
                  aria-label="인트로 영상 URL"
                  value={state.introVideoUrl}
                  onChange={(event) => updateField(setState, "introVideoUrl", event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </Field>
              <ListEditor
                title="갤러리 이미지"
                testId="gallery-images"
                addLabel="갤러리 이미지 추가"
                emptyLabel="등록된 갤러리 이미지가 없습니다."
                rowLabel="갤러리 이미지"
                items={state.galleryImages}
                emptyItem={emptyGalleryImage}
                onChange={(items) => updateField(setState, "galleryImages", items)}
                renderItem={(image, index, update) => (
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                    <ImagePathField
                      label={`갤러리 이미지 ${index + 1}`}
                      value={image.imagePath}
                      onChange={(value) => update({ imagePath: value })}
                    />
                    <Field label="대체 텍스트">
                      <Input
                        aria-label={`갤러리 이미지 ${index + 1} 대체 텍스트`}
                        value={image.altText}
                        onChange={(event) => update({ altText: event.target.value })}
                      />
                    </Field>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>구성 및 사용 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <ListEditor
                title="구성품"
                testId="included-items"
                addLabel="구성품 추가"
                emptyLabel="등록된 구성품이 없습니다."
                rowLabel="구성품"
                items={state.includedItems}
                emptyItem={emptyIncludedItem}
                onChange={(items) => updateField(setState, "includedItems", items)}
                renderItem={(item, _index, update) => (
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                    <Field label="구성품명">
                      <Input
                        aria-label="구성품명"
                        value={item.name}
                        onChange={(event) => update({ name: event.target.value })}
                      />
                    </Field>
                    <Field label="구성품 유형">
                      <Input
                        aria-label="구성품 유형"
                        value={item.category}
                        onChange={(event) => update({ category: event.target.value })}
                      />
                    </Field>
                    <Field label="사용 메모" className="md:col-span-2">
                      <Textarea
                        aria-label="사용 메모"
                        value={item.description}
                        onChange={(event) => update({ description: event.target.value })}
                        rows={3}
                      />
                    </Field>
                  </div>
                )}
              />
              <ListEditor
                title="사용 단계"
                testId="routine-steps"
                addLabel="사용 단계 추가"
                emptyLabel="등록된 사용 단계가 없습니다."
                rowLabel="사용 단계"
                items={state.routineSteps}
                emptyItem={emptyRoutineStep}
                onChange={(items) => updateField(setState, "routineSteps", items)}
                renderItem={(step, _index, update) => (
                  <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
                    <Field label="단계명">
                      <Input
                        aria-label="단계명"
                        value={step.title}
                        onChange={(event) => update({ title: event.target.value })}
                      />
                    </Field>
                    <Field label="수행 방법">
                      <Input
                        aria-label="수행 방법"
                        value={step.body}
                        onChange={(event) => update({ body: event.target.value })}
                      />
                    </Field>
                  </div>
                )}
              />
            </CardContent>
          </Card>
          <AdminDisclosureNotesEditor
            notes={state.disclosureNotes}
            onChange={(disclosureNotes) => updateField(setState, "disclosureNotes", disclosureNotes)}
          />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <PublishReadinessCard checks={readinessChecks} />
          <AdminProductSummaryCard product={previewProduct} />
        </div>
      </div>

      <div id="admin-product-story" className="scroll-mt-24">
        <AdminDetailSectionsEditor
          product={previewProduct}
          sections={state.detailSections}
          onChange={(sections) => updateField(setState, "detailSections", sections)}
        />
      </div>

      <AdminProductActionBar
        mode={previewTab}
        productStatus={currentProduct?.status ?? "draft"}
        saveState={saveState}
        canArchive={mode === "edit" && Boolean(currentProduct?.id)}
        onSaveDraft={() => saveProduct("draft")}
        onPublish={() => saveProduct("active")}
        onPreview={() => setPreviewTab("preview")}
        onBackToEdit={() => setPreviewTab("edit")}
        onArchive={hideCurrentProduct}
        onCancel={() => router.push("/admin/products")}
      />
    </div>
  );
}

export function AdminProductForm() {
  return <AdminProductEditor mode="create" />;
}

function AdminProductActionBar({
  mode,
  productStatus,
  saveState,
  canArchive,
  onSaveDraft,
  onPublish,
  onPreview,
  onBackToEdit,
  onArchive,
  onCancel
}: {
  mode: PreviewTab;
  productStatus: ProductStatus;
  saveState: SaveState;
  canArchive: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onBackToEdit: () => void;
  onArchive: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const publishLabel = productStatus === "active" ? "변경사항 발행" : "판매중으로 발행";

  const bar = (
    <div
      className="border-t bg-white/95 px-4 py-3 backdrop-blur"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      <div className="container flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          현재 상태: <span className="font-semibold">{getStatusLabel(productStatus)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={saveState === "saving"} onClick={onSaveDraft}>
            <Save className="h-4 w-4" aria-hidden="true" />
            임시저장
          </Button>
          {mode === "preview" ? (
            <Button type="button" variant="outline" onClick={onBackToEdit}>
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              편집으로 돌아가기
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onPreview}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              미리보기
            </Button>
          )}
          <Button type="button" disabled={saveState === "saving"} onClick={onPublish}>
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {publishLabel}
          </Button>
          {canArchive ? (
            <Button type="button" variant="outline" disabled={saveState === "saving"} onClick={onArchive}>
              <Archive className="h-4 w-4" aria-hidden="true" />
              숨기기
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" aria-hidden="true" />
            취소
          </Button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") {
    return bar;
  }

  return createPortal(bar, document.body);
}

function AdminProductSummaryCard({ product }: { product: Product }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4" aria-hidden="true" />
          판매 화면 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <SummaryRow icon={<PackageCheck className="h-4 w-4" />} label="상품명" value={product.name} />
        <SummaryRow icon={<DollarSign className="h-4 w-4" />} label="가격" value={product.option.priceCents ? `$${(product.option.priceCents / 100).toFixed(2)}` : "$0.00"} />
        <SummaryRow icon={<Settings2 className="h-4 w-4" />} label="재고" value={`${product.option.stockQuantity}개`} />
        <SummaryRow icon={<ListChecks className="h-4 w-4" />} label="상세 섹션" value={`${product.detailSections.length}개`} />
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 rounded-md border bg-white p-3">
      <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="mt-0.5 block font-semibold">{value}</span>
      </span>
    </div>
  );
}

function AdminDisclosureNotesEditor({
  notes,
  onChange
}: {
  notes: ProductDisclosureNotes;
  onChange: (notes: ProductDisclosureNotes) => void;
}) {
  const [openSectionIds, setOpenSectionIds] = useState<Set<ProductDisclosureSectionId>>(
    () => new Set(["curatorsNote"])
  );
  const incompleteFields = getIncompleteProductDisclosureFields(notes);
  const totalFields = productDisclosureSections.reduce((sum, section) => sum + section.fields.length, 0);
  const completeCount = totalFields - incompleteFields.length;

  function toggleSection(sectionId: ProductDisclosureSectionId) {
    setOpenSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function updateNote(
    sectionId: ProductDisclosureSectionId,
    fieldId: string,
    value: string
  ) {
    onChange({
      ...notes,
      [sectionId]: {
        ...notes[sectionId],
        [fieldId]: value
      }
    } as ProductDisclosureNotes);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>구매 전 공개 정보</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              상품 상세 구매 영역에 표시되는 관리자 전용 안내입니다.
            </p>
          </div>
          <span
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-semibold",
              incompleteFields.length === 0 ? "bg-[#d8f8e7] text-[#14532d]" : "bg-muted text-muted-foreground"
            )}
          >
            {completeCount}/{totalFields} 완료
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {productDisclosureSections.map((section) => {
          const isOpen = openSectionIds.has(section.id);
          const sectionMissingCount = incompleteFields.filter((field) => field.sectionId === section.id).length;
          const panelId = `admin-disclosure-${section.id}`;

          return (
            <section key={section.id} className="rounded-md border bg-white">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-base font-bold">{section.label}</span>
                  <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                    {sectionMissingCount === 0 ? "완료" : `${sectionMissingCount}개 미입력`}
                  </span>
                </span>
                <ChevronDown
                  className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
              {isOpen ? (
                <div id={panelId} className="grid gap-4 border-t p-4">
                  {section.fields.map((field) => {
                    const value = (notes[section.id] as Record<string, string>)[field.id] ?? "";

                    return (
                      <Field key={field.id} label={field.label}>
                        <Textarea
                          aria-label={`${section.label} ${field.label}`}
                          value={value}
                          onChange={(event) => updateNote(section.id, field.id, event.target.value)}
                          rows={4}
                          className="min-h-28 resize-y"
                        />
                      </Field>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AdminDetailSectionsEditor({
  product,
  sections,
  onChange
}: {
  product: Product;
  sections: DetailSectionDraft[];
  onChange: (sections: DetailSectionDraft[]) => void;
}) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(sections[0]?.id ?? null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const activeSectionId = selectedSectionId ?? sections[0]?.id ?? null;
  const selectedIndex = sections.findIndex((section) => section.id === activeSectionId);
  const selectedSection = selectedIndex >= 0 ? sections[selectedIndex] : null;

  useEffect(() => {
    if (sections.length === 0) {
      setSelectedSectionId(null);
      return;
    }

    if (!selectedSectionId || !sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  useEffect(() => {
    const root = editorRootRef.current;

    if (!root) {
      return;
    }

    const rootElement = root;

    function selectSectionFromEvent(event: Event) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const sectionElement = target.closest<HTMLElement>("[data-detail-section-id]");

      if (!sectionElement || !rootElement.contains(sectionElement)) {
        return;
      }

      const sectionId = sectionElement.dataset.detailSectionId;

      if (sectionId) {
        setSelectedSectionId(sectionId);
      }
    }

    rootElement.addEventListener("focusin", selectSectionFromEvent);
    rootElement.addEventListener("pointerdown", selectSectionFromEvent);
    rootElement.addEventListener("mousedown", selectSectionFromEvent);
    rootElement.addEventListener("click", selectSectionFromEvent);

    return () => {
      rootElement.removeEventListener("focusin", selectSectionFromEvent);
      rootElement.removeEventListener("pointerdown", selectSectionFromEvent);
      rootElement.removeEventListener("mousedown", selectSectionFromEvent);
      rootElement.removeEventListener("click", selectSectionFromEvent);
    };
  }, []);

  function updateSection(index: number, nextSection: DetailSectionDraft) {
    onChange(normalizeDetailSectionOrders(sections.map((section, sectionIndex) => (sectionIndex === index ? nextSection : section))));
  }

  function insertSection(type: SectionType, afterIndex = selectedIndex) {
    const nextSection = createDraftSection(type, product);
    const safeIndex = afterIndex >= 0 ? afterIndex : sections.length - 1;
    const next = [...sections];
    next.splice(safeIndex + 1, 0, nextSection);
    onChange(normalizeDetailSectionOrders(next));
    setSelectedSectionId(nextSection.id);
  }

  function removeSection(index: number) {
    const nextSelected = sections[index + 1]?.id ?? sections[index - 1]?.id ?? null;
    setSelectedSectionId(nextSelected);
    onChange(normalizeDetailSectionOrders(sections.filter((_, sectionIndex) => sectionIndex !== index)));
  }

  function moveSection(from: number, to: number) {
    onChange(normalizeDetailSectionOrders(moveItem(sections, from, to)));
  }

  function startSectionDrag(event: React.DragEvent<HTMLButtonElement>, sectionId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sectionId);
    setDraggedSectionId(sectionId);
    setSelectedSectionId(sectionId);
  }

  function dropSection(event: React.DragEvent<HTMLElement>, targetSectionId: string) {
    event.preventDefault();
    const sourceSectionId = draggedSectionId ?? event.dataTransfer.getData("text/plain");

    if (!sourceSectionId || sourceSectionId === targetSectionId) {
      setDraggedSectionId(null);
      return;
    }

    const from = sections.findIndex((section) => section.id === sourceSectionId);
    const to = sections.findIndex((section) => section.id === targetSectionId);

    if (from < 0 || to < 0) {
      setDraggedSectionId(null);
      return;
    }

    moveSection(from, to);
    setSelectedSectionId(sourceSectionId);
    setDraggedSectionId(null);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">상세 페이지 문서</p>
            <h2 className="text-2xl font-bold tracking-normal">상세 스토리 에디터</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {product.name} · {product.status === "active" ? "공개 접근 가능" : getStatusLabel(product.status)}
            </p>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              브랜드파트너 수정 폼과 같은 구조로 섹션을 추가하고, 드래그로 순서를 바꾸며, 우측 설정에서
              글자 크기·색상·배치·이미지 표시 방식을 조정합니다.
            </p>
          </div>
          <span className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
            {sections.length}개 섹션
          </span>
        </div>
      </section>

      <div ref={editorRootRef} className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
          <SectionInsertBar onInsert={(type) => insertSection(type, -1)} />
          <div className="grid gap-4" role="list" aria-label="상세 섹션 목록">
            {sections.map((section, index) => (
              <article
                key={section.id}
                data-detail-section-id={section.id}
                role="listitem"
                tabIndex={0}
                aria-label={`상세 섹션 ${index + 1}: ${sectionLabels[section.sectionType]}`}
                onPointerDownCapture={() => setSelectedSectionId(section.id)}
                onMouseDownCapture={() => setSelectedSectionId(section.id)}
                onClickCapture={() => setSelectedSectionId(section.id)}
                onFocusCapture={() => setSelectedSectionId(section.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => dropSection(event, section.id)}
                className={cn(
                  "group min-w-0 overflow-hidden rounded-md border bg-white px-5 py-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3d7f]/40",
                  activeSectionId === section.id && "border-[#ff3d7f] ring-2 ring-[#ff3d7f]/15",
                  draggedSectionId === section.id && "opacity-60"
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    draggable
                    aria-label={`섹션 ${index + 1} ${sectionLabels[section.sectionType]} 선택 및 드래그`}
                    className="flex min-w-0 items-center gap-2 text-left text-muted-foreground transition hover:text-foreground"
                    onClick={() => setSelectedSectionId(section.id)}
                    onDragStart={(event) => startSectionDrag(event, section.id)}
                    onDragEnd={() => setDraggedSectionId(null)}
                  >
                    <span className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border bg-muted" aria-hidden="true">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black uppercase tracking-normal">
                        {String(index + 1).padStart(2, "0")} · {sectionLabels[section.sectionType]}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{getSectionSummary(section)}</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <IconButton label="위로 이동" disabled={index === 0} onClick={() => moveSection(index, index - 1)}>
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="아래로 이동" disabled={index === sections.length - 1} onClick={() => moveSection(index, index + 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="삭제" disabled={sections.length === 1} onClick={() => removeSection(index)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <DetailSectionCanvasFields
                  product={product}
                  section={section}
                  onChange={(nextSection) => updateSection(index, nextSection)}
                />

                {activeSectionId === section.id ? (
                  <div className="mt-4 border-t pt-3">
                    <SectionInsertBar compact onInsert={(type) => insertSection(type, index)} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </main>

        <aside className="min-w-0 h-fit xl:sticky xl:top-6">
          <DetailSectionInspector
            section={selectedSection}
            onChange={(nextSection) => selectedIndex >= 0 && updateSection(selectedIndex, nextSection)}
          />
        </aside>
      </div>
    </div>
  );
}

function SectionInsertBar({
  compact = false,
  onInsert
}: {
  compact?: boolean;
  onInsert: (type: SectionType) => void;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 max-w-full grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2 rounded-md border bg-white p-3",
        compact && "grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] bg-muted/30"
      )}
    >
      {!compact ? (
        <span className="col-span-full inline-flex min-h-10 items-center gap-2 px-2 text-xs font-black text-muted-foreground">
          <ListPlus className="h-4 w-4" aria-hidden="true" />
          새 내용 추가
        </span>
      ) : null}
      {sectionPalette.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.type}
            type="button"
            aria-label={`${item.label} 추가`}
            title={item.description}
            className={cn(
              "focus-ring inline-flex min-h-10 min-w-0 items-center justify-start gap-2 rounded-md border bg-white px-3 text-sm font-black transition hover:border-[#ff3d7f] hover:bg-[#ffd6e3]",
              compact && "min-h-9 px-2 text-xs"
            )}
            onClick={() => onInsert(item.type)}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{compact ? item.shortLabel : item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DetailSectionCanvasFields({
  product,
  section,
  onChange
}: {
  product: Product;
  section: DetailSectionDraft;
  onChange: (section: DetailSectionDraft) => void;
}) {
  function patch(patchValue: Partial<DetailSectionDraft>) {
    onChange({ ...section, ...patchValue } as DetailSectionDraft);
  }

  if (section.sectionType === "heading") {
    return (
      <Textarea
        aria-label="제목"
        value={section.text}
        onChange={(event) => patch({ text: event.target.value })}
        rows={2}
        className={cn(
          "min-h-24 resize-y overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-2 font-brand-heavy leading-tight shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
          getHeadingEditorSizeClass(section.fontSize, section.level),
          getEditorTextColorClass(section.textColor, "default")
        )}
        placeholder="새 섹션 제목"
      />
    );
  }

  if (section.sectionType === "text") {
    return (
      <Textarea
        aria-label="본문"
        value={section.body}
        onChange={(event) => patch({ body: event.target.value })}
        rows={7}
        className={cn(
          "min-h-40 resize-y whitespace-pre-wrap border-0 bg-transparent px-0 py-1 shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
          getBodyEditorSizeClass(section.fontSize, "large"),
          getEditorTextColorClass(section.textColor, "muted"),
          getEditorFontWeightClass(section.fontWeight)
        )}
        placeholder="제품 스토리, 사용감, 추천 포인트를 작성하세요."
      />
    );
  }

  if (section.sectionType === "image" || section.sectionType === "long_detail_image") {
    return (
      <div className="grid gap-3">
        <DocumentMediaInput
          label={section.sectionType === "long_detail_image" ? "긴 상세 이미지" : "이미지"}
          value={section.src}
          onChange={(src) => patch({ src })}
          tall={section.sectionType === "long_detail_image"}
        />
        <Input
          aria-label="캡션"
          value={section.caption ?? ""}
          onChange={(event) => patch({ caption: event.target.value })}
          placeholder="캡션"
        />
      </div>
    );
  }

  if (section.sectionType === "image_text") {
    return (
      <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DocumentMediaInput label="이미지" value={section.src} onChange={(src) => patch({ src })} />
        <div className="grid min-w-0 gap-3">
          <Textarea
            aria-label="이미지 텍스트 제목"
            value={section.title}
            onChange={(event) => patch({ title: event.target.value })}
            rows={2}
            className={cn(
              "min-h-20 resize-y overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 font-black leading-tight shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
              getHeadingEditorSizeClass(section.titleSize, "h3"),
              getEditorTextColorClass(section.titleColor, "default")
            )}
            placeholder="이미지 섹션 제목"
          />
          <Textarea
            aria-label="이미지 텍스트 본문"
            value={section.body}
            onChange={(event) => patch({ body: event.target.value })}
            rows={5}
            className={cn(
              "resize-y whitespace-pre-wrap border-0 bg-transparent px-0 py-1 shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
              getBodyEditorSizeClass(section.bodySize, "base"),
              getEditorTextColorClass(section.bodyColor, "muted")
            )}
            placeholder="이미지를 설명하는 본문을 작성하세요."
          />
        </div>
      </div>
    );
  }

  if (section.sectionType === "image_group") {
    return (
      <div className="grid gap-3">
        <Textarea
          aria-label="이미지 묶음 제목"
          value={section.title ?? ""}
          onChange={(event) => patch({ title: event.target.value })}
          rows={2}
          className={cn(
            "min-h-20 resize-y overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 font-black leading-tight shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
            getHeadingEditorSizeClass(section.titleSize, "h3"),
            getEditorTextColorClass(section.titleColor, "default")
          )}
          placeholder="이미지 모음 제목"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {section.images.map((image, itemIndex) => (
            <div key={itemIndex} className="grid gap-2 rounded-md border bg-muted/30 p-2">
              <DocumentMediaInput
                label={`이미지 ${itemIndex + 1}`}
                value={image.src}
                onChange={(src) => patch({ images: updateAt(section.images, itemIndex, { src }) })}
              />
              <Input
                aria-label={`이미지 ${itemIndex + 1} 캡션`}
                value={image.caption ?? ""}
                onChange={(event) => patch({ images: updateAt(section.images, itemIndex, { caption: event.target.value }) })}
                placeholder="캡션"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={section.images.length === 1}
                  onClick={() => patch({ images: section.images.filter((_, index) => index !== itemIndex) })}
                >
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            patch({
              images: [...section.images, { src: product.heroImagePath, alt: product.name, caption: "" }]
            })
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          이미지 추가
        </Button>
      </div>
    );
  }

  if (section.sectionType === "video") {
    return (
      <div className="grid gap-3">
        <Textarea
          aria-label="영상 제목"
          value={section.title ?? ""}
          onChange={(event) => patch({ title: event.target.value })}
          rows={2}
          className="min-h-20 resize-y overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 text-2xl font-black leading-tight shadow-none [overflow-wrap:anywhere] focus-visible:ring-0"
          placeholder="영상 제목"
        />
        <Input
          aria-label="영상 URL"
          value={section.url}
          onChange={(event) => patch({ url: event.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>
    );
  }

  if (section.sectionType === "comparison") {
    return (
      <div className="grid gap-3">
        <Textarea
          aria-label="비교 제목"
          value={section.title}
          onChange={(event) => patch({ title: event.target.value })}
          rows={2}
          className="min-h-20 resize-y overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 text-2xl font-black leading-tight shadow-none [overflow-wrap:anywhere] focus-visible:ring-0"
          placeholder="비교 제목"
        />
        <div className="grid gap-2 md:grid-cols-2">
          {section.items.map((item, itemIndex) => (
            <div key={itemIndex} className="grid gap-2 rounded-md border bg-muted/30 p-3">
              <Input
                aria-label={`비교 항목 ${itemIndex + 1} 라벨`}
                value={item.label}
                onChange={(event) => patch({ items: updateAt(section.items, itemIndex, { label: event.target.value }) })}
                placeholder="항목명"
              />
              <Textarea
                aria-label={`비교 항목 ${itemIndex + 1} 내용`}
                value={item.body}
                onChange={(event) => patch({ items: updateAt(section.items, itemIndex, { body: event.target.value }) })}
                rows={3}
                className={cn(
                  "resize-y whitespace-pre-wrap [overflow-wrap:anywhere]",
                  getBodyEditorSizeClass(section.bodySize, "small"),
                  getEditorTextColorClass(section.bodyColor, "muted")
                )}
                placeholder="내용"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={section.items.length === 1}
                  onClick={() => patch({ items: section.items.filter((_, index) => index !== itemIndex) })}
                >
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => patch({ items: [...section.items, { label: "새 항목", body: "내용을 입력해주세요." }] })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          항목 추가
        </Button>
      </div>
    );
  }

  if (section.sectionType === "steps") {
    return (
      <div className="grid gap-4">
        <div className="rounded-md border bg-muted/30 p-4">
          <Field label="단계 묶음 제목">
            <Textarea
              aria-label="단계 제목"
              value={section.title ?? ""}
              onChange={(event) => patch({ title: event.target.value })}
              rows={2}
              className={cn(
                "min-h-20 resize-y overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 font-black leading-tight shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
                getHeadingEditorSizeClass(section.titleSize, "h3"),
                getEditorTextColorClass(section.titleColor, "default")
              )}
              placeholder="예: 사용 순서, 제작 과정, 신청 절차"
            />
          </Field>
        </div>

        <div className="grid gap-3">
          {section.items.map((item, itemIndex) => (
            <div key={itemIndex} className="grid gap-4 rounded-md border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-brand-round text-4xl leading-none text-[#ff3d7f]">
                    {String(itemIndex + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-xs font-black text-muted-foreground">단계 항목</p>
                </div>
                <IconButton
                  label="삭제"
                  disabled={section.items.length === 1}
                  onClick={() => patch({ items: section.items.filter((_, index) => index !== itemIndex) })}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <Field label="단계명">
                  <Input
                    aria-label={`단계 ${itemIndex + 1} 단계명`}
                    value={item.title}
                    onChange={(event) =>
                      patch({ items: updateAt(section.items, itemIndex, { title: event.target.value }) })
                    }
                    placeholder="예: 세안하기"
                  />
                </Field>
                <Field label="내용">
                  <Textarea
                    aria-label={`단계 ${itemIndex + 1} 내용`}
                    value={item.body}
                    onChange={(event) =>
                      patch({ items: updateAt(section.items, itemIndex, { body: event.target.value }) })
                    }
                    rows={4}
                    className={cn(
                      "resize-y whitespace-pre-wrap [overflow-wrap:anywhere]",
                      getBodyEditorSizeClass(section.bodySize, "small"),
                      getEditorTextColorClass(section.bodyColor, "muted")
                    )}
                    placeholder="이 단계에서 보여줄 설명을 작성하세요."
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => patch({ items: [...section.items, { title: "새 단계", body: "내용을 입력해주세요." }] })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          단계 추가
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border bg-[#fff8f0] p-4">
      <Textarea
        aria-label="공지 제목"
        value={section.title}
        onChange={(event) => patch({ title: event.target.value })}
        rows={2}
        className={cn(
          "min-h-20 resize-y overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 font-black leading-tight shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
          getHeadingEditorSizeClass(section.titleSize, "h3"),
          getEditorTextColorClass(section.titleColor, "default")
        )}
        placeholder="안내 제목"
      />
      <Textarea
        aria-label="공지 본문"
        value={section.body}
        onChange={(event) => patch({ body: event.target.value })}
        rows={4}
        className={cn(
          "resize-y whitespace-pre-wrap border-0 bg-transparent px-0 py-1 shadow-none [overflow-wrap:anywhere] focus-visible:ring-0",
          getBodyEditorSizeClass(section.bodySize, "small"),
          getEditorTextColorClass(section.bodyColor, "muted")
        )}
        placeholder="안내 내용을 작성하세요."
      />
    </div>
  );
}

function DetailSectionInspector({
  section,
  onChange
}: {
  section: DetailSectionDraft | null;
  onChange: (section: DetailSectionDraft) => void;
}) {
  if (!section) {
    return (
      <div className="rounded-md border bg-white p-4">
        <p className="text-sm font-semibold text-muted-foreground">선택된 섹션이 없습니다.</p>
      </div>
    );
  }

  function patch(patchValue: Partial<DetailSectionDraft>) {
    onChange({ ...section, ...patchValue } as DetailSectionDraft);
  }

  return (
    <div className="grid gap-4 rounded-md border bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
          <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black">고급 설정</p>
          <p className="text-xs text-muted-foreground">{sectionLabels[section.sectionType]}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {section.sectionType === "heading" ? (
          <>
            <SelectField
              label="제목 단계"
              value={section.level}
              options={[
                ["h2", "큰 제목"],
                ["h3", "중간 제목"]
              ]}
              onChange={(value) => patch({ level: value as typeof section.level })}
            />
            <TextStyleControls
              label="텍스트"
              sizeValue={section.fontSize ?? (section.level === "h3" ? "medium" : "large")}
              sizeOptions={headingSizeOptions}
              colorValue={section.textColor ?? "default"}
              onSizeChange={(fontSize) => patch({ fontSize: fontSize as typeof section.fontSize })}
              onColorChange={(textColor) => patch({ textColor: textColor as typeof section.textColor })}
            />
            <AlignField value={section.align} onChange={(align) => patch({ align })} />
          </>
        ) : null}

        {section.sectionType === "text" ? (
          <>
            <TextStyleControls
              label="본문"
              sizeValue={section.fontSize ?? "large"}
              sizeOptions={bodySizeOptions}
              colorValue={section.textColor ?? "muted"}
              weightValue={section.fontWeight ?? "regular"}
              onSizeChange={(fontSize) => patch({ fontSize: fontSize as typeof section.fontSize })}
              onColorChange={(textColor) => patch({ textColor: textColor as typeof section.textColor })}
              onWeightChange={(fontWeight) => patch({ fontWeight: fontWeight as typeof section.fontWeight })}
            />
            <AlignField value={section.align} onChange={(align) => patch({ align })} />
          </>
        ) : null}

        {section.sectionType === "image" || section.sectionType === "long_detail_image" ? (
          <>
            <Field label="대체 텍스트">
              <Input
                aria-label="대체 텍스트"
                value={section.alt}
                onChange={(event) => patch({ alt: event.target.value })}
              />
            </Field>
            {section.sectionType === "image" ? (
              <>
                <SelectField
                  label="비율"
                  value={section.aspectRatio}
                  options={[
                    ["natural", "원본"],
                    ["square", "정사각"],
                    ["video", "와이드"]
                  ]}
                  onChange={(value) => patch({ aspectRatio: value as typeof section.aspectRatio })}
                />
                <SelectField
                  label="사진 맞춤"
                  value={section.imageFit ?? "cover"}
                  options={imageFitOptions}
                  onChange={(imageFit) => patch({ imageFit: imageFit as typeof section.imageFit })}
                />
              </>
            ) : (
              <SelectField
                label="너비"
                value={section.maxWidth}
                options={[
                  ["default", "기본"],
                  ["wide", "넓게"],
                  ["full", "전체"]
                ]}
                onChange={(value) => patch({ maxWidth: value as typeof section.maxWidth })}
              />
            )}
          </>
        ) : null}

        {section.sectionType === "image_text" ? (
          <>
            <TextStyleControls
              label="제목"
              sizeValue={section.titleSize ?? "medium"}
              sizeOptions={headingSizeOptions}
              colorValue={section.titleColor ?? "default"}
              onSizeChange={(titleSize) => patch({ titleSize: titleSize as typeof section.titleSize })}
              onColorChange={(titleColor) => patch({ titleColor: titleColor as typeof section.titleColor })}
            />
            <TextStyleControls
              label="본문"
              sizeValue={section.bodySize ?? "base"}
              sizeOptions={bodySizeOptions}
              colorValue={section.bodyColor ?? "muted"}
              onSizeChange={(bodySize) => patch({ bodySize: bodySize as typeof section.bodySize })}
              onColorChange={(bodyColor) => patch({ bodyColor: bodyColor as typeof section.bodyColor })}
            />
            <Field label="보조 라벨">
              <Input
                aria-label="보조 라벨"
                value={section.eyebrow ?? ""}
                onChange={(event) => patch({ eyebrow: event.target.value })}
              />
            </Field>
            <Field label="대체 텍스트">
              <Input
                aria-label="대체 텍스트"
                value={section.alt}
                onChange={(event) => patch({ alt: event.target.value })}
              />
            </Field>
            <SelectField
              label="이미지 위치"
              value={section.imagePosition}
              options={[
                ["left", "왼쪽"],
                ["right", "오른쪽"]
              ]}
              onChange={(value) => patch({ imagePosition: value as typeof section.imagePosition })}
            />
            <SelectField
              label="사진 맞춤"
              value={section.imageFit ?? "cover"}
              options={imageFitOptions}
              onChange={(imageFit) => patch({ imageFit: imageFit as typeof section.imageFit })}
            />
          </>
        ) : null}

        {section.sectionType === "comparison" || section.sectionType === "steps" ? (
          <>
            {section.sectionType === "steps" ? (
              <SelectField
                label="단계 배치"
                value={section.layout ?? "split_cards"}
                options={stepsLayoutOptions}
                onChange={(layout) => patch({ layout } as Partial<DetailSectionDraft>)}
              />
            ) : null}
            <TextStyleControls
              label="제목"
              sizeValue={section.titleSize ?? "medium"}
              sizeOptions={headingSizeOptions}
              colorValue={section.titleColor ?? "default"}
              onSizeChange={(titleSize) => patch({ titleSize } as Partial<DetailSectionDraft>)}
              onColorChange={(titleColor) => patch({ titleColor } as Partial<DetailSectionDraft>)}
            />
            <TextStyleControls
              label="항목 본문"
              sizeValue={section.bodySize ?? "small"}
              sizeOptions={bodySizeOptions}
              colorValue={section.bodyColor ?? "muted"}
              onSizeChange={(bodySize) => patch({ bodySize } as Partial<DetailSectionDraft>)}
              onColorChange={(bodyColor) => patch({ bodyColor } as Partial<DetailSectionDraft>)}
            />
          </>
        ) : null}

        {section.sectionType === "image_group" ? (
          <>
            <TextStyleControls
              label="제목"
              sizeValue={section.titleSize ?? "medium"}
              sizeOptions={headingSizeOptions}
              colorValue={section.titleColor ?? "default"}
              onSizeChange={(titleSize) => patch({ titleSize: titleSize as typeof section.titleSize })}
              onColorChange={(titleColor) => patch({ titleColor: titleColor as typeof section.titleColor })}
            />
            <SelectField
              label="사진 맞춤"
              value={section.imageFit ?? "cover"}
              options={imageFitOptions}
              onChange={(imageFit) => patch({ imageFit: imageFit as typeof section.imageFit })}
            />
            <Field label="이미지 대체 텍스트">
              <div className="grid gap-2">
                {section.images.map((image, index) => (
                  <Input
                    key={index}
                    aria-label={`이미지 ${index + 1} 대체 텍스트`}
                    value={image.alt}
                    onChange={(event) => patch({ images: updateAt(section.images, index, { alt: event.target.value }) })}
                  />
                ))}
              </div>
            </Field>
          </>
        ) : null}

        {section.sectionType === "notice" ? (
          <>
            <TextStyleControls
              label="제목"
              sizeValue={section.titleSize ?? "medium"}
              sizeOptions={headingSizeOptions}
              colorValue={section.titleColor ?? "default"}
              onSizeChange={(titleSize) => patch({ titleSize: titleSize as typeof section.titleSize })}
              onColorChange={(titleColor) => patch({ titleColor: titleColor as typeof section.titleColor })}
            />
            <TextStyleControls
              label="본문"
              sizeValue={section.bodySize ?? "small"}
              sizeOptions={bodySizeOptions}
              colorValue={section.bodyColor ?? "muted"}
              onSizeChange={(bodySize) => patch({ bodySize: bodySize as typeof section.bodySize })}
              onColorChange={(bodyColor) => patch({ bodyColor: bodyColor as typeof section.bodyColor })}
            />
            <SelectField
              label="톤"
              value={section.tone}
              options={[
                ["info", "정보"],
                ["tip", "팁"],
                ["warning", "주의"]
              ]}
              onChange={(value) => patch({ tone: value as typeof section.tone })}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function DocumentMediaInput({
  label,
  value,
  tall = false,
  onChange
}: {
  label: string;
  value: string;
  tall?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
      <div
        className={cn(
          "grid place-items-center rounded-md border bg-white bg-contain bg-center bg-no-repeat",
          tall ? "min-h-80" : "min-h-56"
        )}
        style={value ? { backgroundImage: `url("${value.replaceAll('"', "%22")}")` } : undefined}
      >
        {value ? <span className="sr-only">{label}</span> : <FileImage className="h-10 w-10 text-muted-foreground" />}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <Input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
        <DocumentImageUploadButton onUploaded={onChange} />
      </div>
    </div>
  );
}

function DocumentImageUploadButton({ onUploaded }: { onUploaded: (path: string) => void }) {
  const [uploadState, setUploadState] = useState<SaveState>("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function uploadFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setUploadState("saving");
    setUploadMessage(null);

    try {
      const uploadedPath = await uploadProductImage(file);
      onUploaded(uploadedPath);
      setUploadState("saved");
      setUploadMessage("완료");
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error instanceof Error ? error.message : "실패");
    }
  }

  return (
    <label className="focus-ring flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold">
      <ImagePlus className="h-4 w-4" aria-hidden="true" />
      <span>{uploadState === "saving" ? "업로드 중" : uploadMessage ?? "업로드"}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={uploadState === "saving"}
        onChange={(event) => uploadFile(event.target.files?.[0])}
      />
    </label>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: TValue;
  options: Array<[TValue, string]>;
  onChange: (value: TValue) => void;
}) {
  return (
    <Field label={label}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as TValue)}
        className="focus-ring h-11 w-full rounded-md border bg-white px-3 text-sm"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </Field>
  );
}

function TextStyleControls({
  label,
  sizeValue,
  sizeOptions,
  colorValue,
  weightValue,
  onSizeChange,
  onColorChange,
  onWeightChange
}: {
  label: string;
  sizeValue: string;
  sizeOptions: Array<[string, string]>;
  colorValue: string;
  weightValue?: string;
  onSizeChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onWeightChange?: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-muted-foreground">{label} 스타일</p>
        <span className="rounded-md border bg-muted px-2 py-1 text-xs font-black" aria-hidden="true">
          Aa
        </span>
      </div>
      <SelectField label={`${label} 글자 크기`} value={sizeValue} options={sizeOptions} onChange={onSizeChange} />
      <ColorSwatchField label={`${label} 글자색`} value={colorValue} onChange={onColorChange} />
      {weightValue && onWeightChange ? (
        <SelectField label={`${label} 굵기`} value={weightValue} options={fontWeightOptions} onChange={onWeightChange} />
      ) : null}
    </div>
  );
}

function ColorSwatchField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-3 gap-2">
        {textColorOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={`${label} ${option.label}`}
            className={cn(
              "focus-ring flex min-h-10 items-center gap-2 rounded-md border bg-white px-2 text-xs font-bold",
              value === option.value && "border-[#ff3d7f] ring-2 ring-[#ff3d7f]/20"
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: option.color }} aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function AlignField({
  value,
  onChange
}: {
  value: "left" | "center" | "right";
  onChange: (value: "left" | "center" | "right") => void;
}) {
  return (
    <Field label="정렬">
      <div className="grid grid-cols-3 gap-2">
        {([
          ["left", "왼쪽"],
          ["center", "중앙"],
          ["right", "오른쪽"]
        ] as const).map(([optionValue, label]) => (
          <button
            key={optionValue}
            type="button"
            className={cn(
              "focus-ring min-h-10 rounded-md border bg-white px-2 text-sm font-bold",
              value === optionValue && "border-[#ff3d7f] bg-[#ffd6e3]"
            )}
            onClick={() => onChange(optionValue)}
          >
            {label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function PublishReadinessCard({
  checks
}: {
  checks: Array<{ label: string; ready: boolean }>;
}) {
  const readyCount = checks.filter((check) => check.ready).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>발행 준비 상태</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          필수 항목 {checks.length}개 중 {readyCount}개가 판매중 발행 기준을 충족했습니다.
        </p>
        <ul className="grid gap-2 text-sm">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center justify-between gap-3 rounded-md border bg-white px-3 py-2">
              <span>{check.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-xs font-semibold",
                  check.ready ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {check.ready ? "완료" : "필요"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ListEditor<T>({
  title,
  testId,
  addLabel,
  emptyLabel,
  rowLabel,
  items,
  emptyItem,
  onChange,
  renderItem
}: {
  title: string;
  testId: string;
  addLabel: string;
  emptyLabel: string;
  rowLabel: string;
  items: T[];
  emptyItem: T;
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`add-${testId}`}
          onClick={() => onChange([...items, { ...emptyItem }])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
      <div className="grid gap-3">
        {items.length === 0 ? (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : null}
        {items.map((item, index) => (
          <div key={index} className="rounded-md border bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{rowLabel} {index + 1}</p>
              <div className="flex gap-2">
                <IconButton
                  label="위로 이동"
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(items, index, index - 1))}
                >
                  <ArrowUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="아래로 이동"
                  disabled={index === items.length - 1}
                  onClick={() => onChange(moveItem(items, index, index + 1))}
                >
                  <ArrowDown className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="삭제"
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
            {renderItem(item, index, (patch) =>
              onChange(items.map((current, itemIndex) => (itemIndex === index ? { ...current, ...patch } : current)))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImagePathField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploadState, setUploadState] = useState<SaveState>("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function uploadFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setUploadState("saving");
    setUploadMessage(null);

    try {
      const uploadedPath = await uploadProductImage(file);
      onChange(uploadedPath);
      setUploadState("saved");
      setUploadMessage("업로드 완료");
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error instanceof Error ? error.message : "업로드 실패");
    }
  }

  return (
    <Field label={label}>
      <div className="grid gap-2">
        <Input
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/catalog-assets/..."
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          <span>{uploadState === "saving" ? "업로드 중..." : "이미지 업로드"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={uploadState === "saving"}
            onChange={(event) => uploadFile(event.target.files?.[0])}
          />
        </label>
        {uploadMessage ? (
          <p className={cn("text-xs", uploadState === "error" ? "text-destructive" : "text-muted-foreground")}>
            {uploadMessage}
          </p>
        ) : null}
      </div>
    </Field>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="focus-ring flex h-9 w-9 items-center justify-center rounded-md border bg-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

async function uploadProductImage(file: File) {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/admin/product-images", {
    method: "POST",
    body: form
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "이미지를 업로드하지 못했습니다.");
  }

  return body.publicUrl as string;
}

function createInitialState(product?: Product, currentBrandAssignment?: ProductBrandAssignment | null): EditorState {
  return {
    productType: product?.productType ?? "set",
    brandName: product?.brandName ?? "shipK Curated",
    brandPartnerId: currentBrandAssignment?.brandId ?? "",
    canEditDetails: currentBrandAssignment?.canEditDetails ?? true,
    name: product?.name ?? "",
    category: product?.category ?? "Skincare",
    tagsText: formatLabelList(product?.tags),
    difficulty: product?.difficulty ?? "Beginner",
    itemCount: String(product?.itemCount ?? product?.includedItems.length ?? 1),
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? "",
    bestFor: product?.bestFor ?? "",
    result: product?.result ?? "",
    optionName: product?.option.name ?? "Default option",
    sku: product?.option.sku ?? "",
    priceUsd: product ? (product.option.priceCents / 100).toFixed(2) : "49.00",
    stockQuantity: String(product?.option.stockQuantity ?? 0),
    heroImagePath: product?.heroImagePath ?? "",
    introVideoUrl: product?.introVideoUrl ?? "",
    galleryImages: product?.galleryImages.map(({ imagePath, altText }) => ({ imagePath, altText })) ?? [],
    includedItems: product?.includedItems.map(({ name, category, description }) => ({ name, category, description })) ?? [],
    routineSteps: product?.routineSteps.map(({ title, body }) => ({ title, body })) ?? [],
    detailImages: product?.contentBlocks.filter((block) => block.type === "image").map(stripDetailImageId) ?? [],
    contentBlocks: product?.contentBlocks.filter((block) => block.type !== "image").map(stripContentBlockId) ?? [],
    disclosureNotes: normalizeProductDisclosureNotes(product?.disclosureNotes) ?? createEmptyProductDisclosureNotes(),
    detailSections: createInitialDetailSections(product)
  };
}

function formatLabelList(values: string[] | undefined) {
  return values?.join(", ") ?? "";
}

function parseLabelList(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\n,]/)
    .map((item) => item.trim().replace(/\s+/g, " ").toUpperCase())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
    .slice(0, 6);
}

function getPreviewTags(state: EditorState) {
  const tags = parseLabelList(state.tagsText);
  if (tags.length > 0) {
    return tags;
  }

  const itemCount = Number.parseInt(state.itemCount || "0", 10);
  return [
    state.category.toUpperCase(),
    state.productType === "set" ? "SET" : "SINGLE",
    itemCount > 0 ? `${itemCount} ITEMS` : null
  ].filter((item): item is string => Boolean(item));
}

function stripDetailImageId(block: ProductContentBlock): DetailImageDraft {
  return block.type === "image"
    ? { imagePath: block.imagePath, alt: block.alt }
    : { ...emptyDetailImage };
}

function stripContentBlockId(block: ProductContentBlock): ContentBlockDraft {
  if (block.type === "image") {
    return { type: "image", imagePath: block.imagePath, alt: block.alt };
  }

  if (block.type === "image_text") {
    return {
      type: "image_text",
      imagePath: block.imagePath,
      alt: block.alt,
      eyebrow: block.eyebrow,
      title: block.title,
      body: block.body,
      imagePosition: block.imagePosition
    };
  }

  return {
    type: "text",
    eyebrow: block.eyebrow,
    title: block.title,
    body: block.body
  };
}

function toPayload(state: EditorState, status: ProductStatus) {
  return {
    productType: state.productType,
    brandName: state.brandName,
    brandPartnerId: state.brandPartnerId || null,
    canEditDetails: state.canEditDetails,
    name: state.name,
    category: state.category,
    tags: parseLabelList(state.tagsText),
    difficulty: state.difficulty,
    shortDescription: state.shortDescription,
    description: state.description,
    bestFor: state.bestFor,
    result: state.result,
    optionName: state.optionName,
    sku: state.sku,
    heroImagePath: state.heroImagePath,
    introVideoUrl: state.introVideoUrl,
    status,
    itemCount: state.itemCount,
    priceUsd: state.priceUsd,
    stockQuantity: state.stockQuantity,
    galleryImages: state.galleryImages.filter(hasGalleryImageInput),
    includedItems: state.includedItems.filter(hasIncludedItemInput),
    routineSteps: state.routineSteps.filter(hasRoutineStepInput),
    contentBlocks: buildPayloadContentBlocks(state),
    disclosureNotes: state.disclosureNotes,
    detailSections: toDetailSectionsPayload(state.detailSections)
  };
}

function isHydratableProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") {
    return false;
  }

  const product = value as Partial<Product>;

  return Boolean(
      product.id &&
      product.option &&
      Array.isArray(product.tags) &&
      Array.isArray(product.galleryImages) &&
      Array.isArray(product.includedItems) &&
      Array.isArray(product.routineSteps) &&
      Array.isArray(product.contentBlocks) &&
      Array.isArray(product.detailSections)
  );
}

function toPreviewProduct(state: EditorState, product?: Product): Product {
  const priceCents = Math.max(0, Math.round(Number(state.priceUsd || 0) * 100));
  const stockQuantity = Math.max(0, Number.parseInt(state.stockQuantity || "0", 10) || 0);
  const heroImagePath = state.heroImagePath || "/catalog-assets/admin-product-placeholder.svg";

  return {
    id: product?.id ?? "preview-product",
    slug: product?.slug ?? "preview-product",
    productType: state.productType,
    brandName: state.brandName || "shipK Curated",
    name: state.name || "상품명 미입력",
    category: state.category,
    difficulty: state.difficulty,
    itemCount: Number.parseInt(state.itemCount || "0", 10) || state.includedItems.length || undefined,
    shortDescription: state.shortDescription || "짧은 설명 미입력",
    description: state.description || "상품 소개 미입력",
    bestFor: state.bestFor || undefined,
    result: state.result || undefined,
    heroImagePath,
    introVideoUrl: normalizeEmbeddableVideoUrl(state.introVideoUrl) || undefined,
    badges: product?.badges ?? [],
    tags: getPreviewTags(state),
    status: product?.status ?? "draft",
    option: {
      id: product?.option.id ?? "preview-option",
      name: state.optionName || "기본 옵션",
      sku: state.sku || "PREVIEW-SKU",
      priceCents,
      stockQuantity
    },
    galleryImages: state.galleryImages
      .filter((image) => image.imagePath)
      .map((image, index) => ({
        id: `preview-gallery-${index}`,
        imagePath: image.imagePath,
        altText: image.altText || `${state.name || "Product"} gallery image`
      })),
    includedItems: state.includedItems.map((item, index) => ({
      id: `preview-item-${index}`,
      name: item.name || "구성품명 미입력",
      category: item.category || "구성품 유형",
      description: item.description || "사용 메모 미입력"
    })),
    routineSteps: state.routineSteps.map((step, index) => ({
      id: `preview-step-${index}`,
      title: step.title || "단계명 미입력",
      body: step.body || "수행 방법 미입력"
    })),
    contentBlocks: buildPreviewContentBlocks(state, heroImagePath),
    disclosureNotes: state.disclosureNotes,
    detailSections: toPreviewDetailSections(state.detailSections)
  };
}

function buildPreviewContentBlocks(state: EditorState, heroImagePath: string) {
  const detailImageBlocks = state.detailImages.map((image, index): ProductContentBlock => ({
    id: `preview-detail-image-${index}`,
    type: "image",
    imagePath: image.imagePath || heroImagePath,
    alt: image.alt || `${state.name || "상품"} 상세 이미지 ${index + 1}`
  }));

  const contentBlocks = state.contentBlocks.map((block, index) =>
    addPreviewBlockId(block, index, heroImagePath)
  );

  return [...detailImageBlocks, ...contentBlocks];
}

function buildPayloadContentBlocks(state: EditorState) {
  const detailImageBlocks: ContentBlockDraft[] = state.detailImages
    .filter(hasDetailImageInput)
    .map((image, index) => ({
      type: "image",
      imagePath: image.imagePath,
      alt: image.alt || `${state.name || "상품"} 상세 이미지 ${index + 1}`
    }));

  return [
    ...detailImageBlocks,
    ...state.contentBlocks.filter(hasRenderableBlock)
  ];
}

function addPreviewBlockId(
  block: ContentBlockDraft,
  index: number,
  heroImagePath: string
): ProductContentBlock {
  if (block.type === "image") {
    return {
      id: `preview-block-${index}`,
      type: "image",
      imagePath: block.imagePath || heroImagePath,
      alt: block.alt || "상품 이미지"
    };
  }

  if (block.type === "image_text") {
    return {
      id: `preview-block-${index}`,
      type: "image_text",
      imagePath: block.imagePath || heroImagePath,
      alt: block.alt || "상품 이미지",
      eyebrow: block.eyebrow,
      title: block.title || "콘텐츠 제목 미입력",
      body: block.body || "본문 미입력",
      imagePosition: block.imagePosition || "left"
    };
  }

  return {
    id: `preview-block-${index}`,
    type: "text",
    eyebrow: block.eyebrow,
    title: block.title || "콘텐츠 제목 미입력",
    body: block.body || "본문 미입력"
  };
}

function hasRenderableBlock(block: ContentBlockDraft) {
  if (block.type === "text") {
    return Boolean(block.title || block.body);
  }
  return Boolean(block.imagePath || ("title" in block && block.title) || ("body" in block && block.body));
}

function hasGalleryImageInput(image: GalleryDraft) {
  return Boolean(image.imagePath.trim() || image.altText.trim());
}

function hasDetailImageInput(image: DetailImageDraft) {
  return Boolean(image.imagePath.trim() || image.alt.trim());
}

function hasIncludedItemInput(item: IncludedItemDraft) {
  return Boolean(item.name.trim() || item.category.trim() || item.description.trim());
}

function hasRoutineStepInput(step: RoutineStepDraft) {
  return Boolean(step.title.trim() || step.body.trim());
}

function createInitialDetailSections(product?: Product): DetailSectionDraft[] {
  const sourceSections: Array<ProductDetailSection | ProductDetailSectionInput> =
    product?.detailSections.length
      ? product.detailSections
      : createDefaultDetailSections({
          description: product?.description ?? "상품 상세 스토리를 작성해주세요.",
          bestFor: product?.bestFor,
          result: product?.result,
          heroImagePath: product?.heroImagePath ?? "/catalog-assets/admin-product-placeholder.svg",
          productName: product?.name ?? "새 상품"
        });

  return normalizeDetailSectionOrders(sourceSections.map((section, index) => toDetailSectionDraft(section, index)));
}

function toDetailSectionDraft(
  section: ProductDetailSection | ProductDetailSectionInput,
  index: number
): DetailSectionDraft {
  return {
    ...section,
    id: section.id ?? createDraftId(section.sectionType),
    sortOrder: section.sortOrder ?? index + 1
  } as DetailSectionDraft;
}

function toDetailSectionsPayload(sections: DetailSectionDraft[]): ProductDetailSectionInput[] {
  return normalizeDetailSectionOrders(sections).map((section, index) => ({
    ...section,
    sortOrder: index + 1
  }));
}

function toPreviewDetailSections(sections: DetailSectionDraft[]): ProductDetailSection[] {
  return normalizeDetailSectionOrders(sections).map((section, index) => ({
    ...section,
    id: section.id,
    sortOrder: index + 1
  }));
}

function normalizeDetailSectionOrders(sections: DetailSectionDraft[]) {
  return sections.map((section, index) => ({ ...section, sortOrder: index + 1 }));
}

function normalizeEmbeddableVideoUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : trimmed;
    }

    if (url.hostname.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) {
        return `https://www.youtube.com/embed/${watchId}`;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube.com/embed/${id}` : trimmed;
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function createDraftSection(type: SectionType, product: Product): DetailSectionDraft {
  const base = {
    id: createDraftId(type),
    schemaVersion: productDetailSectionSchemaVersion as 1,
    sortOrder: 1
  };

  if (type === "heading") {
    return {
      ...base,
      sectionType: "heading",
      text: "새 상세 제목",
      level: "h2",
      align: "left",
      fontSize: "large",
      textColor: "default"
    };
  }

  if (type === "text") {
    return {
      ...base,
      sectionType: "text",
      body: "제품 스토리와 고객에게 보여줄 상세 설명을 입력해주세요.",
      align: "left",
      fontSize: "large",
      textColor: "muted",
      fontWeight: "regular"
    };
  }

  if (type === "image") {
    return {
      ...base,
      sectionType: "image",
      src: product.heroImagePath,
      alt: product.name,
      caption: "",
      aspectRatio: "natural",
      imageFit: "cover"
    };
  }

  if (type === "long_detail_image") {
    return {
      ...base,
      sectionType: "long_detail_image",
      src: product.heroImagePath,
      alt: `${product.name} 긴 상세 이미지`,
      caption: "",
      maxWidth: "default"
    };
  }

  if (type === "image_text") {
    return {
      ...base,
      sectionType: "image_text",
      src: product.heroImagePath,
      alt: product.name,
      eyebrow: "Story",
      title: "제품 포인트",
      body: "이미지와 함께 보여줄 설명을 작성해주세요.",
      imagePosition: "left",
      titleSize: "large",
      titleColor: "default",
      bodySize: "base",
      bodyColor: "muted",
      imageFit: "cover"
    };
  }

  if (type === "image_group") {
    return {
      ...base,
      sectionType: "image_group",
      title: "이미지 갤러리",
      images: [{ src: product.heroImagePath, alt: product.name, caption: "" }],
      titleSize: "large",
      titleColor: "default",
      imageFit: "cover"
    };
  }

  if (type === "video") {
    return {
      ...base,
      sectionType: "video",
      title: "제품 영상",
      url: product.introVideoUrl ?? "https://www.youtube.com/embed/dQw4w9WgXcQ"
    };
  }

  if (type === "comparison") {
    return {
      ...base,
      sectionType: "comparison",
      title: "제품 비교 포인트",
      items: [
        { label: "포인트", body: "고객이 비교할 수 있는 핵심 내용을 입력해주세요." }
      ],
      titleSize: "large",
      titleColor: "default",
      bodySize: "small",
      bodyColor: "muted"
    };
  }

  if (type === "steps") {
    return {
      ...base,
      sectionType: "steps",
      title: "사용 순서",
      items: product.routineSteps.length
        ? product.routineSteps.map((step) => ({ title: step.title, body: step.body }))
        : [{ title: "첫 단계", body: "이 단계에서 해야 할 일을 작성해주세요." }],
      layout: "split_cards",
      titleSize: "large",
      titleColor: "default",
      bodySize: "small",
      bodyColor: "muted"
    };
  }

  return {
    ...base,
    sectionType: "notice",
    title: "안내 사항",
    body: "배송, 사용 전 주의사항, 추천 팁 등을 입력해주세요.",
    tone: "info",
    titleSize: "medium",
    titleColor: "default",
    bodySize: "small",
    bodyColor: "muted"
  };
}

function createDraftId(type: SectionType) {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function updateAt<T>(items: T[], index: number, patch: Partial<T>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function getSectionSummary(section: DetailSectionDraft) {
  if (section.sectionType === "heading") {
    return section.text;
  }

  if (section.sectionType === "text") {
    return section.body;
  }

  if (section.sectionType === "image" || section.sectionType === "long_detail_image") {
    return section.caption || section.alt || section.src;
  }

  if (section.sectionType === "image_text" || section.sectionType === "comparison" || section.sectionType === "notice") {
    return section.title;
  }

  if (section.sectionType === "image_group") {
    return section.title || `${section.images.length}개 이미지`;
  }

  if (section.sectionType === "video") {
    return section.title || section.url;
  }

  return section.title || `${section.items.length}개 단계`;
}

function getPublishReadinessChecks(state: EditorState) {
  const checks = [
    { label: "대표 이미지", ready: Boolean(state.heroImagePath.trim()) },
    { label: "가격", ready: Number(state.priceUsd) > 0 },
    { label: "재고 수량 입력", ready: state.stockQuantity.trim() !== "" && Number(state.stockQuantity) >= 0 },
    {
      label: "상품 설명",
      ready: Boolean(state.shortDescription.trim() && state.description.trim())
    },
    {
      label: "상세 문서 섹션",
      ready: state.detailSections.length > 0
    },
    {
      label: "구매 전 공개 정보",
      ready: hasCompleteProductDisclosureNotes(state.disclosureNotes)
    }
  ];

  if (state.productType === "set") {
    checks.push(
      {
        label: "구성품",
        ready: state.includedItems.some((item) => item.name.trim() && item.category.trim() && item.description.trim())
      },
      {
        label: "사용 단계",
        ready: state.routineSteps.some((step) => step.title.trim() && step.body.trim())
      }
    );
  }

  return checks;
}

function updateField<K extends keyof EditorState>(
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
  key: K,
  value: EditorState[K]
) {
  setState((current) => ({ ...current, [key]: value }));
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) {
    return items;
  }

  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function getStatusLabel(status: ProductStatus) {
  if (status === "active") {
    return "판매중";
  }

  if (status === "archived") {
    return "보관됨";
  }

  return "임시저장";
}

function getHeadingEditorSizeClass(fontSize: string | undefined, fallbackLevel: "h2" | "h3") {
  const resolved = fontSize ?? (fallbackLevel === "h3" ? "medium" : "large");

  if (resolved === "hero") {
    return "text-5xl md:text-7xl";
  }

  if (resolved === "display") {
    return "text-5xl md:text-6xl";
  }

  if (resolved === "medium") {
    return "text-3xl md:text-4xl";
  }

  return "text-4xl md:text-5xl";
}

function getBodyEditorSizeClass(fontSize: string | undefined, fallback: "small" | "base" | "large" | "xlarge") {
  const resolved = fontSize ?? fallback;

  if (resolved === "xlarge") {
    return "text-xl leading-9";
  }

  if (resolved === "large") {
    return "text-lg leading-8";
  }

  if (resolved === "small") {
    return "text-sm leading-6";
  }

  return "text-base leading-7";
}

function getEditorTextColorClass(color: string | undefined, fallback: "default" | "muted") {
  const resolved = color ?? fallback;

  if (resolved === "muted") {
    return "text-muted-foreground";
  }

  if (resolved === "pink") {
    return "text-[#ff3d7f]";
  }

  if (resolved === "blue") {
    return "text-[#246bfe]";
  }

  if (resolved === "mint") {
    return "text-[#0f766e]";
  }

  if (resolved === "coral") {
    return "text-[#f97316]";
  }

  return "text-foreground";
}

function getEditorFontWeightClass(weight: string | undefined) {
  if (weight === "black") {
    return "font-black";
  }

  if (weight === "bold") {
    return "font-bold";
  }

  if (weight === "medium") {
    return "font-medium";
  }

  return "";
}
