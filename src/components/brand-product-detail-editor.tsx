"use client";

import {
  ArrowDown,
  ArrowUp,
  Columns2,
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
  PanelRightOpen,
  PencilLine,
  Plus,
  Save,
  Trash2,
  Type,
  Video,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  productDetailSectionSchemaVersion,
  productDetailSectionsPayloadSchema,
  type ProductDetailSection,
  type ProductDetailSectionInput,
  type ProductDetailSectionsPayload
} from "@/lib/product-detail-sections";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";
type PreviewTab = "edit" | "preview";
type SectionType = ProductDetailSectionInput["sectionType"];
type SectionDraft = ProductDetailSectionInput & {
  id: string;
  sortOrder: number;
};

const sectionPalette: Array<{
  type: SectionType;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Heading2;
}> = [
  { type: "heading", label: "제목", shortLabel: "제목", description: "이야기 구간을 나눕니다.", icon: Heading2 },
  { type: "text", label: "문단", shortLabel: "문단", description: "상세 설명을 길게 씁니다.", icon: Type },
  { type: "image", label: "사진", shortLabel: "사진", description: "제품 이미지를 넣습니다.", icon: ImageIcon },
  {
    type: "long_detail_image",
    label: "긴 상세 이미지",
    shortLabel: "긴 이미지",
    description: "Figma에서 만든 세로 이미지를 넣습니다.",
    icon: FileImage
  },
  { type: "image_text", label: "사진+설명", shortLabel: "사진+글", description: "좌우형 소개를 만듭니다.", icon: Columns2 },
  { type: "image_group", label: "사진 모음", shortLabel: "모음", description: "여러 이미지를 묶습니다.", icon: Images },
  { type: "video", label: "영상", shortLabel: "영상", description: "임베드 영상을 넣습니다.", icon: Video },
  { type: "comparison", label: "비교표", shortLabel: "비교", description: "성분, 장점, FAQ를 정리합니다.", icon: MessageSquareText },
  { type: "steps", label: "일반 단계", shortLabel: "단계", description: "과정이나 사용법을 단계별로 나눕니다.", icon: ListChecks },
  { type: "notice", label: "안내 박스", shortLabel: "안내", description: "팁이나 주의사항을 강조합니다.", icon: MessageSquareText }
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

export function BrandProductDetailEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [sections, setSections] = useState<SectionDraft[]>(() => createInitialSections(product));
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("edit");
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const previewProduct = useMemo(() => toPreviewProduct(product, sections), [product, sections]);
  const activeSectionId = selectedSectionId ?? sections[0]?.id ?? null;
  const selectedIndex = sections.findIndex((section) => section.id === activeSectionId);
  const selectedSection = selectedIndex >= 0 ? sections[selectedIndex] : null;

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

  async function saveContent() {
    setSaveState("saving");
    setMessage(null);

    try {
      const payload = toPayload(sections);
      const response = await fetch(`/api/brand/products/${product.id}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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

  function insertSection(type: SectionType, afterIndex = selectedIndex) {
    const nextSection = createDraftSection(type, product);
    setSections((current) => {
      const safeIndex = afterIndex >= 0 ? afterIndex : current.length - 1;
      const next = [...current];
      next.splice(safeIndex + 1, 0, nextSection);
      return normalizeSortOrders(next);
    });
    setSelectedSectionId(nextSection.id);
  }

  function updateSection(index: number, nextSection: SectionDraft) {
    setSections((current) =>
      normalizeSortOrders(current.map((section, sectionIndex) => (sectionIndex === index ? nextSection : section)))
    );
  }

  function removeSection(index: number) {
    setSections((current) => {
      const nextSelected = current[index + 1]?.id ?? current[index - 1]?.id ?? null;
      setSelectedSectionId(nextSelected);
      return normalizeSortOrders(current.filter((_, sectionIndex) => sectionIndex !== index));
    });
  }

  function moveSection(from: number, to: number) {
    setSections((current) => normalizeSortOrders(moveItem(current, from, to)));
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

  if (previewTab === "preview") {
    return (
      <div className="grid gap-4 pb-32">
        <div className="sticky top-0 z-30 rounded-md border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">공개 상세 화면 미리보기</p>
              <p className="text-xs text-muted-foreground">저장 전 편집본 기준으로 표시됩니다.</p>
            </div>
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

        <div className="overflow-hidden rounded-md border bg-background">
          <ProductDetailView product={previewProduct} isAuthenticated previewMode />
        </div>
        <EditorActionBar
          mode="preview"
          saveState={saveState}
          onSave={saveContent}
          onPreview={() => setPreviewTab("preview")}
          onBackToEdit={() => setPreviewTab("edit")}
          onCancel={() => router.push("/brand/products")}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5 pb-32">
      <section className="rounded-md border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">브랜드 포털</p>
            <h2 className="text-2xl font-bold tracking-normal">상세 스토리 에디터</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {product.name} · {product.status === "active" ? "공개 접근 가능" : "초안"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
              {sections.length}개 섹션
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
          >
            {message}
          </p>
        ) : null}
      </section>

      <div ref={editorRootRef} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="grid gap-4">
          <SectionInsertBar onInsert={(type) => insertSection(type, -1)} />
          <section className="grid gap-4" role="list" aria-label="상세 섹션 목록">
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
                  "group rounded-md border bg-white px-5 py-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3d7f]/40",
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
                    <span
                      className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border bg-muted"
                      aria-hidden="true"
                    >
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
                    <IconButton
                      label="위로 이동"
                      disabled={index === 0}
                      onClick={() => moveSection(index, index - 1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="아래로 이동"
                      disabled={index === sections.length - 1}
                      onClick={() => moveSection(index, index + 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="삭제" disabled={sections.length === 1} onClick={() => removeSection(index)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <SectionCanvasFields
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
          </section>
        </main>

        <aside className="h-fit xl:sticky xl:top-6">
          <SectionInspector
            section={selectedSection}
            onChange={(nextSection) => selectedIndex >= 0 && updateSection(selectedIndex, nextSection)}
          />
        </aside>
      </div>
      <EditorActionBar
        mode="edit"
        saveState={saveState}
        onSave={saveContent}
        onPreview={() => setPreviewTab("preview")}
        onBackToEdit={() => setPreviewTab("edit")}
        onCancel={() => router.push("/brand/products")}
      />
    </div>
  );
}

function EditorActionBar({
  mode,
  saveState,
  onSave,
  onPreview,
  onBackToEdit,
  onCancel
}: {
  mode: PreviewTab;
  saveState: SaveState;
  onSave: () => void;
  onPreview: () => void;
  onBackToEdit: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <p className="text-sm text-muted-foreground">상세 스토리 영역에 반영됩니다.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={saveState === "saving"} onClick={onSave}>
            <Save className="h-4 w-4" aria-hidden="true" />
            상세 페이지 저장
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
        "grid gap-2 rounded-md border bg-white p-3",
        compact ? "grid-cols-2 bg-muted/30 sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-5"
      )}
    >
      {!compact ? (
        <span className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-black text-muted-foreground sm:col-span-2 lg:col-span-5">
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
              "focus-ring inline-flex min-h-10 items-center justify-start gap-2 rounded-md border bg-white px-3 text-sm font-black transition hover:border-[#ff3d7f] hover:bg-[#ffd6e3]",
              compact && "min-h-9 px-2 text-xs"
            )}
            onClick={() => onInsert(item.type)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {compact ? item.shortLabel : item.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionCanvasFields({
  product,
  section,
  onChange
}: {
  product: Product;
  section: SectionDraft;
  onChange: (section: SectionDraft) => void;
}) {
  function patch(patchValue: Partial<SectionDraft>) {
    onChange({ ...section, ...patchValue } as SectionDraft);
  }

  if (section.sectionType === "heading") {
    return (
      <Input
        aria-label="제목"
        value={section.text}
        onChange={(event) => patch({ text: event.target.value })}
        className={cn(
          "h-auto border-0 bg-transparent px-0 py-2 font-brand-heavy shadow-none focus-visible:ring-0",
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
          "min-h-40 resize-y border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0",
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
        <MediaInput
          productId={product.id}
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
      <div className="grid items-start gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <MediaInput productId={product.id} label="이미지" value={section.src} onChange={(src) => patch({ src })} />
        <div className="grid gap-3">
          <Input
            aria-label="이미지 텍스트 제목"
            value={section.title}
            onChange={(event) => patch({ title: event.target.value })}
            className={cn(
              "h-auto border-0 bg-transparent px-0 py-1 font-black shadow-none focus-visible:ring-0",
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
              "resize-y border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0",
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
        <Input
          aria-label="이미지 묶음 제목"
          value={section.title ?? ""}
          onChange={(event) => patch({ title: event.target.value })}
          className={cn(
            "h-auto border-0 bg-transparent px-0 py-1 font-black shadow-none focus-visible:ring-0",
            getHeadingEditorSizeClass(section.titleSize, "h3"),
            getEditorTextColorClass(section.titleColor, "default")
          )}
          placeholder="이미지 모음 제목"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {section.images.map((image, itemIndex) => (
            <div key={itemIndex} className="grid gap-2 rounded-md border bg-muted/30 p-2">
              <MediaInput
                productId={product.id}
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
        <Input
          aria-label="영상 제목"
          value={section.title ?? ""}
          onChange={(event) => patch({ title: event.target.value })}
          className="h-auto border-0 bg-transparent px-0 py-1 text-2xl font-black shadow-none focus-visible:ring-0"
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
        <Input
          aria-label="비교 제목"
          value={section.title}
          onChange={(event) => patch({ title: event.target.value })}
          className="h-auto border-0 bg-transparent px-0 py-1 text-2xl font-black shadow-none focus-visible:ring-0"
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
            <Input
              aria-label="단계 제목"
              value={section.title ?? ""}
              onChange={(event) => patch({ title: event.target.value })}
              className={cn(
                "h-auto border-0 bg-transparent px-0 py-1 font-black shadow-none focus-visible:ring-0",
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
                  <p className="mt-1 text-xs font-black text-muted-foreground">일반 단계 항목</p>
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
                      "resize-y",
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
      <Input
        aria-label="공지 제목"
        value={section.title}
        onChange={(event) => patch({ title: event.target.value })}
        className={cn(
          "h-auto border-0 bg-transparent px-0 py-1 font-black shadow-none focus-visible:ring-0",
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
          "resize-y border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0",
          getBodyEditorSizeClass(section.bodySize, "small"),
          getEditorTextColorClass(section.bodyColor, "muted")
        )}
        placeholder="안내 내용을 작성하세요."
      />
    </div>
  );
}

function SectionInspector({
  section,
  onChange
}: {
  section: SectionDraft | null;
  onChange: (section: SectionDraft) => void;
}) {
  if (!section) {
    return (
      <div className="rounded-md border bg-white p-4">
        <p className="text-sm font-semibold text-muted-foreground">선택된 섹션이 없습니다.</p>
      </div>
    );
  }

  function patch(patchValue: Partial<SectionDraft>) {
    onChange({ ...section, ...patchValue } as SectionDraft);
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
                onChange={(layout) => patch({ layout } as Partial<SectionDraft>)}
              />
            ) : null}
            <TextStyleControls
              label="제목"
              sizeValue={section.titleSize ?? "medium"}
              sizeOptions={headingSizeOptions}
              colorValue={section.titleColor ?? "default"}
              onSizeChange={(titleSize) => patch({ titleSize } as Partial<SectionDraft>)}
              onColorChange={(titleColor) => patch({ titleColor } as Partial<SectionDraft>)}
            />
            <TextStyleControls
              label="항목 본문"
              sizeValue={section.bodySize ?? "small"}
              sizeOptions={bodySizeOptions}
              colorValue={section.bodyColor ?? "muted"}
              onSizeChange={(bodySize) => patch({ bodySize } as Partial<SectionDraft>)}
              onColorChange={(bodyColor) => patch({ bodyColor } as Partial<SectionDraft>)}
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

function MediaInput({
  productId,
  label,
  value,
  tall = false,
  onChange
}: {
  productId: string;
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
        <ImageUploadButton productId={productId} onUploaded={onChange} />
      </div>
    </div>
  );
}

function ImageUploadButton({
  productId,
  onUploaded
}: {
  productId: string;
  onUploaded: (path: string) => void;
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
            <span
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: option.color }}
              aria-hidden="true"
            />
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
    <SelectField
      label="정렬"
      value={value}
      options={[
        ["left", "왼쪽"],
        ["center", "가운데"],
        ["right", "오른쪽"]
      ]}
      onChange={onChange}
    />
  );
}

function getHeadingEditorSizeClass(fontSize: string | undefined, fallbackLevel: "h2" | "h3") {
  const resolved = fontSize ?? (fallbackLevel === "h3" ? "medium" : "large");

  if (resolved === "hero") {
    return "text-5xl md:text-6xl";
  }

  if (resolved === "display") {
    return "text-4xl md:text-5xl";
  }

  if (resolved === "medium") {
    return "text-2xl md:text-3xl";
  }

  return "text-3xl md:text-4xl";
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

function createInitialSections(product: Product): SectionDraft[] {
  if (product.detailSections.length > 0) {
    return normalizeSortOrders(product.detailSections.map(toDraftSection));
  }

  const sections: ProductDetailSectionInput[] = [
    {
      id: createDraftId(),
      sectionType: "heading",
      schemaVersion: productDetailSectionSchemaVersion,
      text: product.result || product.name,
      level: "h2",
      align: "left"
    },
    {
      id: createDraftId(),
      sectionType: "text",
      schemaVersion: productDetailSectionSchemaVersion,
      body: product.description || "상세 본문을 입력해주세요.",
      align: "left"
    }
  ];

  if (product.heroImagePath) {
    sections.push({
      id: createDraftId(),
      sectionType: "image",
      schemaVersion: productDetailSectionSchemaVersion,
      src: product.heroImagePath,
      alt: `${product.name} 이미지`,
      aspectRatio: "natural",
      imageFit: "cover"
    });
  }

  sections.push(...convertLegacyContentBlocks(product));

  if (product.routineSteps.length > 0) {
    sections.push({
      id: createDraftId(),
      sectionType: "steps",
      schemaVersion: productDetailSectionSchemaVersion,
      title: "사용 순서",
      layout: "split_cards",
      items: product.routineSteps.map((step) => ({
        title: step.title,
        body: step.body
      }))
    });
  }

  if (product.includedItems.length > 0) {
    sections.push({
      id: createDraftId(),
      sectionType: "comparison",
      schemaVersion: productDetailSectionSchemaVersion,
      title: "구성 포인트",
      items: product.includedItems.slice(0, 6).map((item) => ({
        label: `${item.name} · ${item.category}`,
        body: item.description
      }))
    });
  }

  if (product.bestFor) {
    sections.push({
      id: createDraftId(),
      sectionType: "notice",
      schemaVersion: productDetailSectionSchemaVersion,
      title: "추천 사용 상황",
      body: product.bestFor,
      tone: "tip"
    });
  }

  return normalizeSortOrders(sections.map(toDraftSection));
}

function convertLegacyContentBlocks(product: Product): ProductDetailSectionInput[] {
  return product.contentBlocks.flatMap((block): ProductDetailSectionInput[] => {
    if (block.type === "image") {
      return [
        {
          id: createDraftId(),
          sectionType: "image",
          schemaVersion: productDetailSectionSchemaVersion,
          src: block.imagePath,
          alt: block.alt || product.name,
          aspectRatio: "natural",
          imageFit: "cover"
        }
      ];
    }

    if (block.type === "image_text") {
      return [
        {
          id: createDraftId(),
          sectionType: "image_text",
          schemaVersion: productDetailSectionSchemaVersion,
          src: block.imagePath,
          alt: block.alt || product.name,
          eyebrow: block.eyebrow,
          title: block.title,
          body: block.body,
          imagePosition: block.imagePosition,
          imageFit: "cover"
        }
      ];
    }

    return [
      {
        id: createDraftId(),
        sectionType: "heading",
        schemaVersion: productDetailSectionSchemaVersion,
        text: block.title,
        level: "h2",
        align: "left"
      },
      {
        id: createDraftId(),
        sectionType: "text",
        schemaVersion: productDetailSectionSchemaVersion,
        body: block.body,
        align: "left"
      }
    ];
  });
}

function createDraftSection(type: SectionType, product: Product): SectionDraft {
  const base = {
    id: createDraftId(),
    sortOrder: 1,
    schemaVersion: productDetailSectionSchemaVersion
  } as const;

  if (type === "heading") {
    return {
      ...base,
      sectionType: "heading",
      text: "",
      level: "h2",
      align: "left"
    };
  }

  if (type === "text") {
    return {
      ...base,
      sectionType: "text",
      body: "",
      align: "left"
    };
  }

  if (type === "image") {
    return {
      ...base,
      sectionType: "image",
      src: product.heroImagePath,
      alt: `${product.name} 이미지`,
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
      eyebrow: "",
      title: "",
      body: "",
      imagePosition: "left",
      imageFit: "cover"
    };
  }

  if (type === "image_group") {
    return {
      ...base,
      sectionType: "image_group",
      title: "",
      images: [{ src: product.heroImagePath, alt: product.name, caption: "" }],
      imageFit: "cover"
    };
  }

  if (type === "video") {
    return {
      ...base,
      sectionType: "video",
      title: "",
      url: ""
    };
  }

  if (type === "comparison") {
    return {
      ...base,
      sectionType: "comparison",
      title: "",
      items: [{ label: "", body: "" }]
    };
  }

  if (type === "steps") {
    return {
      ...base,
      sectionType: "steps",
      title: "",
      layout: "split_cards",
      items: [{ title: "", body: "" }]
    };
  }

  return {
    ...base,
    sectionType: "notice",
    title: "",
    body: "",
    tone: "info"
  };
}

function toDraftSection(section: ProductDetailSectionInput | ProductDetailSection): SectionDraft {
  return {
    ...section,
    id: section.id ?? createDraftId(),
    sortOrder: section.sortOrder ?? 1
  } as SectionDraft;
}

function toPayload(sections: SectionDraft[]): ProductDetailSectionsPayload {
  const sectionsToSave = sections.filter(hasMeaningfulContent);
  const payload = {
    sections: normalizeSortOrders(sectionsToSave).map((section) => ({
      ...section,
      sortOrder: section.sortOrder
    }))
  };
  const parsed = productDetailSectionsPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "상세 섹션 입력값을 확인해주세요.");
  }

  return parsed.data;
}

function hasMeaningfulContent(section: SectionDraft) {
  if (section.sectionType === "heading") {
    return Boolean(section.text.trim());
  }

  if (section.sectionType === "text") {
    return Boolean(section.body.trim());
  }

  if (section.sectionType === "image" || section.sectionType === "long_detail_image") {
    return Boolean(section.src.trim() || section.caption?.trim());
  }

  if (section.sectionType === "image_text") {
    return Boolean(section.src.trim() || section.title.trim() || section.body.trim() || section.eyebrow?.trim());
  }

  if (section.sectionType === "image_group") {
    return Boolean(section.title?.trim() || section.images.some((image) => image.src.trim() || image.caption?.trim()));
  }

  if (section.sectionType === "video") {
    return Boolean(section.url.trim() || section.title?.trim());
  }

  if (section.sectionType === "comparison") {
    return Boolean(section.title.trim() || section.items.some((item) => item.label.trim() || item.body.trim()));
  }

  if (section.sectionType === "steps") {
    return Boolean(section.title?.trim() || section.items.some((item) => item.title.trim() || item.body.trim()));
  }

  return Boolean(section.title.trim() || section.body.trim());
}

function toPreviewProduct(product: Product, sections: SectionDraft[]): Product {
  return {
    ...product,
    detailSections: normalizeSortOrders(sections).map((section) => toPreviewSection(section, product))
  };
}

function toPreviewSection(section: SectionDraft, product: Product): ProductDetailSection {
  if (section.sectionType === "heading") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      text: fallbackText(section.text, "새 섹션 제목")
    };
  }

  if (section.sectionType === "text") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      body: fallbackText(section.body, "본문을 입력해주세요.")
    };
  }

  if (section.sectionType === "image") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      src: fallbackText(section.src, product.heroImagePath),
      alt: fallbackText(section.alt, product.name)
    };
  }

  if (section.sectionType === "long_detail_image") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      src: fallbackText(section.src, product.heroImagePath),
      alt: fallbackText(section.alt, product.name)
    };
  }

  if (section.sectionType === "image_text") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      src: fallbackText(section.src, product.heroImagePath),
      alt: fallbackText(section.alt, product.name),
      title: fallbackText(section.title, "이미지 섹션 제목"),
      body: fallbackText(section.body, "본문을 입력해주세요.")
    };
  }

  if (section.sectionType === "image_group") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      images: section.images.map((image) => ({
        src: fallbackText(image.src, product.heroImagePath),
        alt: fallbackText(image.alt, product.name),
        caption: image.caption
      }))
    };
  }

  if (section.sectionType === "video") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      url: fallbackText(section.url, "https://www.youtube.com/embed/dQw4w9WgXcQ")
    };
  }

  if (section.sectionType === "comparison") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      title: fallbackText(section.title, "비교 포인트"),
      items: section.items.map((item) => ({
        label: fallbackText(item.label, "포인트"),
        body: fallbackText(item.body, "내용을 입력해주세요.")
      }))
    };
  }

  if (section.sectionType === "steps") {
    return {
      ...section,
      id: section.id || createDraftId(),
      sortOrder: section.sortOrder,
      items: section.items.map((item) => ({
        title: fallbackText(item.title, "단계"),
        body: fallbackText(item.body, "내용을 입력해주세요.")
      }))
    };
  }

  return {
    ...section,
    id: section.id || createDraftId(),
    sortOrder: section.sortOrder,
    title: fallbackText(section.title, "안내"),
    body: fallbackText(section.body, "내용을 입력해주세요.")
  };
}

function normalizeSortOrders<T extends { sortOrder: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
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

function updateAt<T extends object>(items: T[], index: number, patch: Partial<T>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function getSectionSummary(section: SectionDraft) {
  if (section.sectionType === "heading") {
    return section.text || "제목을 입력하세요.";
  }

  if (section.sectionType === "text") {
    return section.body.slice(0, 70) || "본문을 입력하세요.";
  }

  if (section.sectionType === "image" || section.sectionType === "long_detail_image") {
    return section.caption || section.src || "이미지를 선택하세요.";
  }

  if (section.sectionType === "image_text" || section.sectionType === "comparison" || section.sectionType === "notice") {
    return section.title || "제목을 입력하세요.";
  }

  if (section.sectionType === "image_group") {
    return `${section.images.length}개 이미지`;
  }

  if (section.sectionType === "steps") {
    return `${section.items.length}개 단계`;
  }

  return section.title || section.url || "내용을 입력하세요.";
}

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fallbackText(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}
