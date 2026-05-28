"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Product,
  ProductCollectionSlug,
  ProductContentBlock,
  ProductGalleryImage,
  ProductIncludedItem,
  ProductRoutineStep,
  ProductStatus,
  getCollectionBySlug,
  productCollections
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
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
type ContentBlockDraft = WithoutId<ProductContentBlock>;

type EditorState = {
  productType: Product["productType"];
  brandName: string;
  name: string;
  category: string;
  collectionSlug: ProductCollectionSlug;
  difficulty: Product["difficulty"];
  itemCount: string;
  themeLabel: string;
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

const emptyGalleryImage: GalleryDraft = {
  imagePath: "",
  altText: ""
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

export function AdminProductEditor({
  mode,
  product
}: {
  mode: "create" | "edit";
  product?: Product;
}) {
  const router = useRouter();
  const [state, setState] = useState<EditorState>(() => createInitialState(product));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("edit");
  const previewProduct = useMemo(() => toPreviewProduct(state, product), [state, product]);
  const readinessChecks = useMemo(() => getPublishReadinessChecks(state), [state]);

  async function saveProduct(status: ProductStatus) {
    setSaveState("saving");
    setMessage(null);

    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`,
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

      setSaveState("saved");
      setMessage(
        status === "active"
          ? `${body.product.name} 상품을 판매중으로 발행했습니다.`
          : `${body.product.name} 상품을 임시저장했습니다.`
      );

      if (mode === "create") {
        router.push(`/admin/products/${body.product.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "상품을 저장하지 못했습니다.");
    }
  }

  async function archiveCurrentProduct() {
    if (!product || !window.confirm("이 상품을 보관 처리할까요? 공개 상품 목록에서는 숨겨집니다.")) {
      return;
    }

    setSaveState("saving");
    setMessage(null);
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    const body = await response.json();

    if (!response.ok) {
      setSaveState("error");
      setMessage(body.error ?? "상품을 보관 처리하지 못했습니다.");
      return;
    }

    router.push("/admin/products");
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
                  <option value="curated_set">큐레이션 세트 / 루틴 키트</option>
                  <option value="single">단품 상품</option>
                </select>
              </Field>
              <Field label="컬렉션">
                <select
                  aria-label="컬렉션"
                  value={state.collectionSlug}
                  onChange={(event) => updateField(setState, "collectionSlug", event.target.value as ProductCollectionSlug)}
                  className="h-11 w-full rounded-md border bg-white px-3 text-sm"
                >
                  {productCollections.map((collection) => (
                    <option key={collection.slug} value={collection.slug}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="브랜드 / 큐레이터">
                <Input
                  aria-label="브랜드 / 큐레이터"
                  value={state.brandName}
                  onChange={(event) => updateField(setState, "brandName", event.target.value)}
                  required
                />
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
                <Input
                  aria-label="카테고리"
                  value={state.category}
                  onChange={(event) => updateField(setState, "category", event.target.value)}
                  required
                />
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
              <Field label="테마 라벨">
                <Input
                  aria-label="테마 라벨"
                  value={state.themeLabel}
                  onChange={(event) => updateField(setState, "themeLabel", event.target.value)}
                  maxLength={16}
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
              <CollectionEditor
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
              <CardTitle>상세 상품 관리</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <CollectionEditor
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
              <CollectionEditor
                title="루틴 단계"
                testId="routine-steps"
                addLabel="루틴 단계 추가"
                emptyLabel="등록된 루틴 단계가 없습니다."
                rowLabel="루틴 단계"
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
                testId="detail-images"
                addLabel="상세 이미지 추가"
                emptyLabel="등록된 상세 이미지가 없습니다."
                rowLabel="상세 이미지"
                items={state.detailImages}
                emptyItem={emptyDetailImage}
                onChange={(items) => updateField(setState, "detailImages", items)}
                renderItem={(image, index, update) => (
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                    <ImagePathField
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
                testId="content-blocks"
                addLabel="콘텐츠 블록 추가"
                emptyLabel="등록된 콘텐츠 블록이 없습니다."
                rowLabel="콘텐츠 블록"
                items={state.contentBlocks}
                emptyItem={emptyContentBlock}
                onChange={(items) => updateField(setState, "contentBlocks", items)}
                renderItem={(block, _index, update) => (
                  <ContentBlockFields block={block} update={update} />
                )}
              />
            </CardContent>
          </Card>

          <PublishReadinessCard checks={readinessChecks} />

          <div className="sticky bottom-3 z-20 rounded-md border bg-white p-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={saveState === "saving"}
                onClick={() => saveProduct("draft")}
              >
                임시저장
              </Button>
              <Button
                type="button"
                disabled={saveState === "saving"}
                onClick={() => saveProduct("active")}
              >
                판매중으로 발행
              </Button>
              {mode === "edit" ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saveState === "saving"}
                  onClick={archiveCurrentProduct}
                >
                  보관 처리
                </Button>
              ) : null}
              <p className="text-sm text-muted-foreground">
                현재 상태: <span className="font-semibold">{getStatusLabel(product?.status ?? "draft")}</span>
              </p>
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
        </div>

        <aside className={cn("min-w-0", previewTab === "edit" && "hidden xl:block")}>
          <div className="sticky top-6 overflow-hidden rounded-md border bg-background">
            <div className="border-b bg-white px-4 py-3">
              <p className="text-sm font-semibold">실시간 상품 미리보기</p>
              <p className="text-xs text-muted-foreground">
                왼쪽 입력값이 고객 상세 화면 순서대로 즉시 반영됩니다.
              </p>
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

export function AdminProductForm() {
  return <AdminProductEditor mode="create" />;
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

function CollectionEditor<T>({
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

function ContentBlockFields({
  block,
  update
}: {
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
              value={"eyebrow" in block ? block.eyebrow ?? "" : ""}
              onChange={(event) => update({ eyebrow: event.target.value } as Partial<ContentBlockDraft>)}
            />
          </Field>
          <Field label="콘텐츠 제목">
            <Input
              aria-label="콘텐츠 제목"
              value={"title" in block ? block.title : ""}
              onChange={(event) => update({ title: event.target.value } as Partial<ContentBlockDraft>)}
            />
          </Field>
          <Field label="본문" className="md:col-span-2">
            <Textarea
              aria-label="본문"
              value={"body" in block ? block.body : ""}
              onChange={(event) => update({ body: event.target.value } as Partial<ContentBlockDraft>)}
              rows={3}
            />
          </Field>
        </div>
      ) : null}
      {block.type !== "text" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <ImagePathField
            label="블록 이미지"
            value={"imagePath" in block ? block.imagePath : ""}
            onChange={(value) => update({ imagePath: value } as Partial<ContentBlockDraft>)}
          />
          <Field label="이미지 대체 텍스트">
            <Input
              aria-label="이미지 대체 텍스트"
              value={"alt" in block ? block.alt : ""}
              onChange={(event) => update({ alt: event.target.value } as Partial<ContentBlockDraft>)}
            />
          </Field>
          {block.type === "image_text" ? (
            <Field label="이미지 위치">
              <select
                aria-label="이미지 위치"
                value={"imagePosition" in block ? block.imagePosition : "left"}
                onChange={(event) =>
                  update({ imagePosition: event.target.value as "left" | "right" } as Partial<ContentBlockDraft>)
                }
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

function createInitialState(product?: Product): EditorState {
  const collectionSlug = product?.collectionSlug ?? "daily-glow";
  const collection = getCollectionBySlug(collectionSlug);

  return {
    productType: product?.productType ?? "curated_set",
    brandName: product?.brandName ?? "shipK Curated",
    name: product?.name ?? "",
    category: product?.category ?? "Routine Kit",
    collectionSlug,
    difficulty: product?.difficulty ?? "Beginner",
    itemCount: String(product?.itemCount ?? product?.includedItems.length ?? 1),
    themeLabel: product?.themeLabel ?? collection.themeLabel,
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
    contentBlocks: product?.contentBlocks.filter((block) => block.type !== "image").map(stripContentBlockId) ?? []
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

function toPayload(state: EditorState, status: ProductStatus) {
  return {
    productType: state.productType,
    brandName: state.brandName,
    name: state.name,
    category: state.category,
    collectionSlug: state.collectionSlug,
    difficulty: state.difficulty,
    themeLabel: state.themeLabel,
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
    contentBlocks: buildPayloadContentBlocks(state)
  };
}

function toPreviewProduct(state: EditorState, product?: Product): Product {
  const collection = getCollectionBySlug(state.collectionSlug);
  const priceCents = Math.max(0, Math.round(Number(state.priceUsd || 0) * 100));
  const stockQuantity = Math.max(0, Number.parseInt(state.stockQuantity || "0", 10) || 0);
  const heroImagePath = state.heroImagePath || "/catalog-assets/admin-product-placeholder.svg";

  return {
    id: product?.id ?? "preview-product",
    slug: product?.slug ?? "preview-product",
    productType: state.productType,
    brandName: state.brandName || "shipK Curated",
    name: state.name || "상품명 미입력",
    category: state.category || "Routine Kit",
    collectionSlug: state.collectionSlug,
    collectionName: collection.name,
    difficulty: state.difficulty,
    itemCount: Number.parseInt(state.itemCount || "0", 10) || state.includedItems.length || undefined,
    themeLabel: state.themeLabel || collection.themeLabel,
    shortDescription: state.shortDescription || "짧은 설명 미입력",
    description: state.description || "상품 소개 미입력",
    bestFor: state.bestFor || undefined,
    result: state.result || undefined,
    heroImagePath,
    introVideoUrl: state.introVideoUrl || undefined,
    badges: ["미리보기", collection.name],
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
    detailSections: []
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

function getPublishReadinessChecks(state: EditorState) {
  const checks = [
    { label: "대표 이미지", ready: Boolean(state.heroImagePath.trim()) },
    { label: "가격", ready: Number(state.priceUsd) > 0 },
    { label: "재고 수량 입력", ready: state.stockQuantity.trim() !== "" && Number(state.stockQuantity) >= 0 },
    {
      label: "상품 설명",
      ready: Boolean(state.shortDescription.trim() && state.description.trim())
    }
  ];

  if (state.productType === "curated_set") {
    checks.push(
      {
        label: "구성품",
        ready: state.includedItems.some((item) => item.name.trim() && item.category.trim() && item.description.trim())
      },
      {
        label: "루틴 단계",
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
