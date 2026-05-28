"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  Product,
  ProductContentBlock,
  ProductGalleryImage,
  ProductIncludedItem,
  ProductRoutineStep
} from "@/lib/products";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";
type PreviewTab = "edit" | "preview";
type GalleryDraft = Omit<ProductGalleryImage, "id">;
type IncludedItemDraft = Omit<ProductIncludedItem, "id">;
type RoutineStepDraft = Omit<ProductRoutineStep, "id">;
type DetailImageDraft = {
  imagePath: string;
  alt: string;
};
type ContentBlockDraft = {
  type: "text" | "image" | "image_text";
  eyebrow?: string;
  title?: string;
  body?: string;
  imagePath?: string;
  alt?: string;
  imagePosition?: "left" | "right";
};

type EditorState = {
  shortDescription: string;
  description: string;
  bestFor: string;
  result: string;
  heroImagePath: string;
  introVideoUrl: string;
  galleryImages: GalleryDraft[];
  includedItems: IncludedItemDraft[];
  routineSteps: RoutineStepDraft[];
  detailImages: DetailImageDraft[];
  contentBlocks: ContentBlockDraft[];
};

const emptyGalleryImage: GalleryDraft = {
  imagePath: "",
  altText: ""
};

const emptyIncludedItem: IncludedItemDraft = {
  name: "",
  category: "",
  description: ""
};

const emptyRoutineStep: RoutineStepDraft = {
  title: "",
  body: ""
};

const emptyDetailImage: DetailImageDraft = {
  imagePath: "",
  alt: ""
};

const emptyContentBlock: ContentBlockDraft = {
  type: "image_text",
  eyebrow: "",
  title: "",
  body: "",
  imagePath: "",
  alt: "",
  imagePosition: "left"
};

export function BrandProductDetailEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [state, setState] = useState<EditorState>(() => createInitialState(product));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("edit");
  const previewProduct = useMemo(() => toPreviewProduct(product, state), [product, state]);

  async function saveContent() {
    setSaveState("saving");
    setMessage(null);

    try {
      const response = await fetch(`/api/brand/products/${product.id}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(state))
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "상세 페이지를 저장하지 못했습니다.");
      }

      setSaveState("saved");
      setMessage(`${body.product.name} 상세 페이지를 저장했습니다.`);
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "상세 페이지를 저장하지 못했습니다.");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex rounded-md border bg-white p-1 xl:hidden">
        <button
          type="button"
          className={cn(
            "h-10 flex-1 rounded-sm text-sm font-semibold",
            previewTab === "edit" ? "bg-foreground text-white" : "text-muted-foreground"
          )}
          onClick={() => setPreviewTab("edit")}
        >
          편집
        </button>
        <button
          type="button"
          className={cn(
            "h-10 flex-1 rounded-sm text-sm font-semibold",
            previewTab === "preview" ? "bg-foreground text-white" : "text-muted-foreground"
          )}
          onClick={() => setPreviewTab("preview")}
        >
          미리보기
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
        <div className={cn("grid gap-5", previewTab === "preview" && "hidden xl:grid")}>
          <section className="rounded-md border bg-white p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-muted-foreground">브랜드 포털</p>
              <h2 className="text-2xl font-bold tracking-normal">상세 페이지 수정</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                상품명, 가격, 재고, 판매 상태는 운영자만 변경할 수 있습니다.
              </p>
            </div>
            <div className="grid gap-4">
              <Field label="짧은 설명">
                <Input
                  aria-label="짧은 설명"
                  value={state.shortDescription}
                  onChange={(event) => updateField(setState, "shortDescription", event.target.value)}
                />
              </Field>
              <Field label="상품 소개 본문">
                <Textarea
                  aria-label="상품 소개 본문"
                  value={state.description}
                  onChange={(event) => updateField(setState, "description", event.target.value)}
                  rows={5}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="추천 상황">
                  <Input
                    aria-label="추천 상황"
                    value={state.bestFor}
                    onChange={(event) => updateField(setState, "bestFor", event.target.value)}
                  />
                </Field>
                <Field label="기대 결과">
                  <Input
                    aria-label="기대 결과"
                    value={state.result}
                    onChange={(event) => updateField(setState, "result", event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-md border bg-white p-5">
            <h3 className="text-lg font-bold tracking-normal">이미지와 영상</h3>
            <div className="mt-4 grid gap-5">
              <ImagePathField
                productId={product.id}
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
              <CollectionEditor
                title="갤러리 이미지"
                addLabel="갤러리 이미지 추가"
                rowLabel="갤러리 이미지"
                emptyLabel="등록된 갤러리 이미지가 없습니다."
                items={state.galleryImages}
                emptyItem={emptyGalleryImage}
                onChange={(items) => updateField(setState, "galleryImages", items)}
                renderItem={(image, index, update) => (
                  <div className="grid gap-3 md:grid-cols-2">
                    <ImagePathField
                      productId={product.id}
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
            </div>
          </section>

          <section className="rounded-md border bg-white p-5">
            <h3 className="text-lg font-bold tracking-normal">사용법과 상세 블록</h3>
            <div className="mt-4 grid gap-5">
              <CollectionEditor
                title="구성품 사용 메모"
                addLabel="구성품 메모 추가"
                rowLabel="구성품"
                emptyLabel="등록된 구성품 메모가 없습니다."
                items={state.includedItems}
                emptyItem={emptyIncludedItem}
                onChange={(items) => updateField(setState, "includedItems", items)}
                renderItem={(item, _index, update) => (
                  <div className="grid gap-3 md:grid-cols-2">
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
              <CollectionEditor
                title="루틴 단계"
                addLabel="루틴 단계 추가"
                rowLabel="루틴 단계"
                emptyLabel="등록된 루틴 단계가 없습니다."
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
              <CollectionEditor
                title="상세 이미지"
                addLabel="상세 이미지 추가"
                rowLabel="상세 이미지"
                emptyLabel="등록된 상세 이미지가 없습니다."
                items={state.detailImages}
                emptyItem={emptyDetailImage}
                onChange={(items) => updateField(setState, "detailImages", items)}
                renderItem={(image, index, update) => (
                  <div className="grid gap-3 md:grid-cols-2">
                    <ImagePathField
                      productId={product.id}
                      label={`상세 이미지 ${index + 1}`}
                      value={image.imagePath}
                      onChange={(value) => update({ imagePath: value })}
                    />
                    <Field label="대체 텍스트">
                      <Input
                        aria-label={`상세 이미지 ${index + 1} 대체 텍스트`}
                        value={image.alt}
                        onChange={(event) => update({ alt: event.target.value })}
                      />
                    </Field>
                  </div>
                )}
              />
              <CollectionEditor
                title="콘텐츠 블록"
                addLabel="콘텐츠 블록 추가"
                rowLabel="콘텐츠 블록"
                emptyLabel="등록된 콘텐츠 블록이 없습니다."
                items={state.contentBlocks}
                emptyItem={emptyContentBlock}
                onChange={(items) => updateField(setState, "contentBlocks", items)}
                renderItem={(block, _index, update) => (
                  <ContentBlockFields
                    productId={product.id}
                    block={block}
                    update={update}
                  />
                )}
              />
            </div>
          </section>

          <div className="sticky bottom-3 z-20 rounded-md border bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={saveState === "saving"} onClick={saveContent}>
                <Save className="h-4 w-4" aria-hidden="true" />
                상세 페이지 저장
              </Button>
              <p className="text-sm text-muted-foreground">
                고객-facing 상세 콘텐츠에 바로 반영됩니다.
              </p>
            </div>
            {message ? (
              <p
                role="status"
                className={cn(
                  "mt-3 rounded-md p-3 text-sm",
                  saveState === "error" ? "bg-destructive/10 text-destructive" : "bg-muted"
                )}
              >
                {message}
              </p>
            ) : null}
          </div>
        </div>

        <aside className={cn("min-w-0", previewTab === "edit" && "hidden xl:block")}>
          <div className="sticky top-6 overflow-hidden rounded-md border bg-background">
            <div className="border-b bg-white px-4 py-3">
              <p className="text-sm font-semibold">고객 상세 화면 미리보기</p>
              <p className="text-xs text-muted-foreground">저장 전 입력값을 기준으로 확인합니다.</p>
            </div>
            <div className="max-h-[calc(100vh-9rem)] overflow-auto">
              <ProductDetailView product={previewProduct} isAuthenticated previewMode />
            </div>
          </div>
        </aside>
      </div>
    </div>
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

function CollectionEditor<T>({
  title,
  addLabel,
  rowLabel,
  emptyLabel,
  items,
  emptyItem,
  onChange,
  renderItem
}: {
  title: string;
  addLabel: string;
  rowLabel: string;
  emptyLabel: string;
  items: T[];
  emptyItem: T;
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold">{title}</h4>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { ...emptyItem }])}>
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
              <p className="text-sm font-semibold">
                {rowLabel} {index + 1}
              </p>
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

function ContentBlockFields({
  productId,
  block,
  update
}: {
  productId: string;
  block: ContentBlockDraft;
  update: (patch: Partial<ContentBlockDraft>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="콘텐츠 유형">
        <select
          aria-label="콘텐츠 유형"
          value={block.type}
          onChange={(event) => update({ type: event.target.value as ContentBlockDraft["type"] })}
          className="h-11 w-full rounded-md border bg-white px-3 text-sm"
        >
          <option value="text">텍스트</option>
          <option value="image">이미지</option>
          <option value="image_text">이미지 + 텍스트</option>
        </select>
      </Field>
      {block.type !== "image" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="보조 라벨">
            <Input
              aria-label="보조 라벨"
              value={block.eyebrow ?? ""}
              onChange={(event) => update({ eyebrow: event.target.value })}
            />
          </Field>
          <Field label="콘텐츠 제목">
            <Input
              aria-label="콘텐츠 제목"
              value={block.title ?? ""}
              onChange={(event) => update({ title: event.target.value })}
            />
          </Field>
          <Field label="본문" className="md:col-span-2">
            <Textarea
              aria-label="본문"
              value={block.body ?? ""}
              onChange={(event) => update({ body: event.target.value })}
              rows={3}
            />
          </Field>
        </div>
      ) : null}
      {block.type !== "text" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <ImagePathField
            productId={productId}
            label="블록 이미지"
            value={block.imagePath ?? ""}
            onChange={(value) => update({ imagePath: value })}
          />
          <Field label="이미지 대체 텍스트">
            <Input
              aria-label="이미지 대체 텍스트"
              value={block.alt ?? ""}
              onChange={(event) => update({ alt: event.target.value })}
            />
          </Field>
          {block.type === "image_text" ? (
            <Field label="이미지 위치">
              <select
                aria-label="이미지 위치"
                value={block.imagePosition ?? "left"}
                onChange={(event) => update({ imagePosition: event.target.value as "left" | "right" })}
                className="h-11 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="left">왼쪽</option>
                <option value="right">오른쪽</option>
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ImagePathField({
  productId,
  label,
  value,
  onChange
}: {
  productId: string;
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
      const uploadedPath = await uploadBrandProductImage(productId, file);
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

async function uploadBrandProductImage(productId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`/api/brand/products/${productId}/images`, {
    method: "POST",
    body: form
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "이미지를 업로드하지 못했습니다.");
  }

  return body.publicUrl as string;
}

function createInitialState(product: Product): EditorState {
  return {
    shortDescription: product.shortDescription,
    description: product.description,
    bestFor: product.bestFor ?? "",
    result: product.result ?? "",
    heroImagePath: product.heroImagePath,
    introVideoUrl: product.introVideoUrl ?? "",
    galleryImages: product.galleryImages.map(({ imagePath, altText }) => ({ imagePath, altText })),
    includedItems: product.includedItems.map(({ name, category, description }) => ({ name, category, description })),
    routineSteps: product.routineSteps.map(({ title, body }) => ({ title, body })),
    detailImages: product.contentBlocks.filter((block) => block.type === "image").map(stripDetailImageId),
    contentBlocks: product.contentBlocks.filter((block) => block.type !== "image").map(stripContentBlockId)
  };
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

function toPayload(state: EditorState) {
  return {
    shortDescription: state.shortDescription,
    description: state.description,
    bestFor: state.bestFor,
    result: state.result,
    heroImagePath: state.heroImagePath,
    introVideoUrl: state.introVideoUrl,
    galleryImages: state.galleryImages.filter(hasGalleryImageInput),
    includedItems: state.includedItems.filter(hasIncludedItemInput),
    routineSteps: state.routineSteps.filter(hasRoutineStepInput),
    contentBlocks: buildPayloadContentBlocks(state)
  };
}

function toPreviewProduct(product: Product, state: EditorState): Product {
  return {
    ...product,
    shortDescription: state.shortDescription || "짧은 설명 미입력",
    description: state.description || "상품 소개 미입력",
    bestFor: state.bestFor || undefined,
    result: state.result || undefined,
    heroImagePath: state.heroImagePath || product.heroImagePath,
    introVideoUrl: state.introVideoUrl || undefined,
    galleryImages: state.galleryImages
      .filter((image) => image.imagePath)
      .map((image, index) => ({
        id: `preview-gallery-${index}`,
        imagePath: image.imagePath,
        altText: image.altText || `${product.name} gallery image`
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
    contentBlocks: buildPreviewContentBlocks(state, product)
  };
}

function buildPayloadContentBlocks(state: EditorState) {
  const detailImageBlocks: ContentBlockDraft[] = state.detailImages
    .filter(hasDetailImageInput)
    .map((image, index) => ({
      type: "image",
      imagePath: image.imagePath,
      alt: image.alt || `상세 이미지 ${index + 1}`
    }));

  return [
    ...detailImageBlocks,
    ...state.contentBlocks.filter(hasRenderableBlock)
  ];
}

function buildPreviewContentBlocks(state: EditorState, product: Product) {
  const heroImagePath = state.heroImagePath || product.heroImagePath;
  const detailImageBlocks = state.detailImages.map((image, index): ProductContentBlock => ({
    id: `preview-detail-image-${index}`,
    type: "image",
    imagePath: image.imagePath || heroImagePath,
    alt: image.alt || `${product.name} 상세 이미지 ${index + 1}`
  }));

  const contentBlocks = state.contentBlocks.map((block, index): ProductContentBlock => {
    if (block.type === "image") {
      return {
        id: `preview-block-${index}`,
        type: "image",
        imagePath: block.imagePath || heroImagePath,
        alt: block.alt || product.name
      };
    }

    if (block.type === "image_text") {
      return {
        id: `preview-block-${index}`,
        type: "image_text",
        imagePath: block.imagePath || heroImagePath,
        alt: block.alt || product.name,
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
  });

  return [...detailImageBlocks, ...contentBlocks];
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

function hasRenderableBlock(block: ContentBlockDraft) {
  if (block.type === "text") {
    return Boolean(block.title?.trim() || block.body?.trim());
  }

  return Boolean(block.imagePath?.trim() || block.title?.trim() || block.body?.trim());
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
