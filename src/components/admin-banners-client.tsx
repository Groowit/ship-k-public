"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  ImagePlus,
  Link2,
  PencilLine,
  Plus,
  Save,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getBalancedBannerTextLines } from "@/lib/banner-text";
import { getImageOptimizationProps } from "@/lib/image-path";
import type { HomeBanner, HomeBannerFontKey, HomeBannerTextColor } from "@/lib/home-banners";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";
type UploadTarget = "backgroundImagePath" | "sideImagePath";

type BannerFormState = {
  topic: string;
  headline: string;
  description: string;
  backgroundImagePath: string;
  sideImagePath: string;
  linkPath: string;
  fontKey: HomeBannerFontKey;
  topicTextColor: HomeBannerTextColor;
  headlineTextColor: HomeBannerTextColor;
  descriptionTextColor: HomeBannerTextColor;
};

const newBannerId = "new";

const fontOptions: Array<{ value: HomeBannerFontKey; label: string }> = [
  { value: "brand-display", label: "브랜드 디스플레이" },
  { value: "black-sans", label: "굵은 산세리프" },
  { value: "standard-sans", label: "기본 산세리프" }
];

const textColorOptions: Array<{ value: HomeBannerTextColor; label: string; swatch: string }> = [
  { value: "black", label: "블랙", swatch: "#111111" },
  { value: "white", label: "화이트", swatch: "#ffffff" },
  { value: "shipk-pink", label: "shipK 핑크", swatch: "#ff3d7f" },
  { value: "teal", label: "틸", swatch: "#087f6f" },
  { value: "coral", label: "코랄", swatch: "#f05d5e" },
  { value: "muted-dark", label: "차분한 다크", swatch: "#3f3f46" }
];

const fontClassByKey: Record<HomeBannerFontKey, string> = {
  "brand-display": "font-brand-heavy",
  "black-sans": "font-black",
  "standard-sans": "font-semibold"
};

const textColorClassByKey: Record<HomeBannerTextColor, { eyebrow: string; headline: string; body: string; overlay: string }> = {
  black: {
    eyebrow: "text-black",
    headline: "text-[#1c1c1c]",
    body: "text-black/65",
    overlay: "bg-white/58"
  },
  white: {
    eyebrow: "text-white",
    headline: "text-white",
    body: "text-white/82",
    overlay: "bg-black/42"
  },
  "shipk-pink": {
    eyebrow: "text-[#ff3d7f]",
    headline: "text-[#ff3d7f]",
    body: "text-[#8a2448]",
    overlay: "bg-white/62"
  },
  teal: {
    eyebrow: "text-[#087f6f]",
    headline: "text-[#087f6f]",
    body: "text-[#245b53]",
    overlay: "bg-white/60"
  },
  coral: {
    eyebrow: "text-[#f05d5e]",
    headline: "text-[#d93f45]",
    body: "text-[#8a3939]",
    overlay: "bg-white/62"
  },
  "muted-dark": {
    eyebrow: "text-zinc-700",
    headline: "text-zinc-800",
    body: "text-zinc-600",
    overlay: "bg-white/64"
  }
};

export function AdminBannersClient({ initialBanners }: { initialBanners: HomeBanner[] }) {
  const router = useRouter();
  const [banners, setBanners] = useState(() => sortBanners(initialBanners));
  const [selectedBannerId, setSelectedBannerId] = useState(banners[0]?.id ?? newBannerId);
  const [form, setForm] = useState<BannerFormState>(() => toBannerForm(banners[0]));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);

  const selectedBanner = useMemo(
    () => banners.find((banner) => banner.id === selectedBannerId) ?? null,
    [banners, selectedBannerId]
  );
  const savedForm = useMemo(() => toBannerForm(selectedBanner), [selectedBanner]);
  const isNewBanner = selectedBannerId === newBannerId;
  const isBusy = saveState === "saving" || uploadTarget !== null;
  const isDirty = !areBannerFormsEqual(form, savedForm);

  useEffect(() => {
    const nextBanners = sortBanners(initialBanners);
    setBanners(nextBanners);
    setSelectedBannerId((currentId) =>
      currentId === newBannerId || nextBanners.some((banner) => banner.id === currentId)
        ? currentId
        : nextBanners[0]?.id ?? newBannerId
    );
  }, [initialBanners]);

  useEffect(() => {
    setForm(toBannerForm(selectedBanner));
  }, [selectedBanner]);

  function updateForm<TKey extends keyof BannerFormState>(key: TKey, value: BannerFormState[TKey]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setMessage(null);
  }

  function startCreate() {
    if (!confirmDiscardChanges()) {
      return;
    }

    setSelectedBannerId(newBannerId);
    setForm(toBannerForm(null));
    setSaveState("idle");
    setMessage(null);
  }

  function selectBanner(id: string) {
    if (!confirmDiscardChanges()) {
      return;
    }

    setSelectedBannerId(id);
  }

  function confirmDiscardChanges() {
    return !isDirty || window.confirm("저장되지 않은 변경사항이 있습니다. 이동하면 변경사항이 사라집니다.");
  }

  async function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setMessage(null);

    try {
      if (!isClientInternalLinkPath(form.linkPath)) {
        throw new Error("링크는 /shop 또는 /products/... 같은 내부 경로만 사용할 수 있습니다.");
      }

      const response = await fetch(isNewBanner ? "/api/admin/banners" : `/api/admin/banners/${selectedBannerId}`, {
        method: isNewBanner ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBannerPayload(form))
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "배너를 저장하지 못했습니다.");
      }

      const savedBanner = body.banner as HomeBanner;
      setBanners((current) =>
        sortBanners(
          current.some((banner) => banner.id === savedBanner.id)
            ? current.map((banner) => (banner.id === savedBanner.id ? savedBanner : banner))
            : [...current, savedBanner]
        )
      );
      setSelectedBannerId(savedBanner.id);
      setSaveState("saved");
      setMessage(isNewBanner ? "배너를 등록했습니다." : "배너를 저장했습니다.");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "배너를 저장하지 못했습니다.");
    }
  }

  async function deleteSelectedBanner() {
    if (!selectedBanner || !window.confirm("이 배너를 삭제할까요? 삭제하면 홈에서 바로 사라집니다.")) {
      return;
    }

    setSaveState("saving");
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/banners/${selectedBanner.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "배너를 삭제하지 못했습니다.");
      }

      const nextBanners = sortBanners((body.banners as HomeBanner[] | undefined) ?? banners.filter((banner) => banner.id !== selectedBanner.id));
      setBanners(nextBanners);
      setSelectedBannerId(nextBanners[0]?.id ?? newBannerId);
      setSaveState("saved");
      setMessage("배너를 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "배너를 삭제하지 못했습니다.");
    }
  }

  async function moveBanner(id: string, direction: -1 | 1) {
    const fromIndex = banners.findIndex((banner) => banner.id === id);
    const toIndex = fromIndex + direction;

    if (fromIndex < 0 || toIndex < 0 || toIndex >= banners.length) {
      return;
    }

    const nextBanners = [...banners];
    const [movedBanner] = nextBanners.splice(fromIndex, 1);
    nextBanners.splice(toIndex, 0, movedBanner);

    setSaveState("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/banners/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextBanners.map((banner) => banner.id) })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "배너 순서를 저장하지 못했습니다.");
      }

      setBanners(sortBanners((body.banners as HomeBanner[] | undefined) ?? nextBanners));
      setSaveState("saved");
      setMessage("배너 순서를 저장했습니다.");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "배너 순서를 저장하지 못했습니다.");
    }
  }

  async function uploadBannerImage(target: UploadTarget, file: File | undefined) {
    if (!file) {
      return;
    }

    setUploadTarget(target);
    setSaveState("saving");
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/banner-images", {
        method: "POST",
        body: formData
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "이미지를 업로드하지 못했습니다.");
      }

      const uploadedUrl = String(body.publicUrl ?? "");
      if (!uploadedUrl) {
        throw new Error("업로드된 이미지 URL을 받지 못했습니다.");
      }

      setForm((current) => ({ ...current, [target]: uploadedUrl }));
      setSaveState("idle");
      setMessage(
        target === "backgroundImagePath"
          ? "배경 사진을 업로드했습니다. 저장하면 홈에 바로 반영됩니다."
          : "보조 상품 사진을 업로드했습니다. 저장하면 홈에 바로 반영됩니다."
      );
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadTarget(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
      <section className="grid content-start gap-4">
        <div className="rounded-md border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold tracking-normal">노출 순서</h3>
              <p className="text-sm text-muted-foreground">{banners.length}개 배너</p>
            </div>
            <Button type="button" size="sm" onClick={startCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              새 배너
            </Button>
          </div>
        </div>

        <div className="grid gap-3" role="list" aria-label="홈 배너 목록">
          {banners.length ? (
            banners.map((banner, index) => (
              <article
                key={banner.id}
                role="listitem"
                className={cn(
                  "grid gap-3 rounded-md border bg-white p-3",
                  selectedBannerId === banner.id ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => selectBanner(banner.id)}
                  className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 text-left"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-md border bg-muted">
                    <Image
                      src={banner.backgroundImagePath}
                      alt=""
                      fill
                      {...getImageOptimizationProps(banner.backgroundImagePath)}
                      sizes="72px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black uppercase text-muted-foreground">
                      {index + 1}. {getBannerListTopic(banner)}
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold">{getBannerListTitle(banner)}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{banner.linkPath}</span>
                  </span>
                </button>
                <div className="flex flex-wrap gap-2">
                  <IconButton
                    label={`${getBannerListTitle(banner)} 위로 이동`}
                    disabled={index === 0 || isBusy}
                    onClick={() => moveBanner(banner.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`${getBannerListTitle(banner)} 아래로 이동`}
                    disabled={index === banners.length - 1 || isBusy}
                    onClick={() => moveBanner(banner.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => selectBanner(banner.id)}
                  >
                    <PencilLine className="h-4 w-4" aria-hidden="true" />
                    수정
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-md border bg-white p-8 text-center text-sm text-muted-foreground">
              등록된 홈 배너가 없습니다.
            </div>
          )}
        </div>
      </section>

      <section className="grid content-start gap-5">
        <div className="rounded-md border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                {isNewBanner ? "신규 등록" : "수정 중"}
              </p>
              <h3 className="text-xl font-bold tracking-normal">
                {isNewBanner ? "새 홈 배너" : selectedBanner ? getBannerListTitle(selectedBanner) : "홈 배너"}
              </h3>
            </div>
            {!isNewBanner ? (
              <Button type="button" variant="destructive" size="sm" disabled={isBusy} onClick={deleteSelectedBanner}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                삭제
              </Button>
            ) : null}
          </div>
          {message ? (
            <p
              role="status"
              className={cn(
                "mt-4 rounded-md border p-3 text-sm",
                saveState === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted"
              )}
              data-testid="admin-banner-message"
            >
              {message}
            </p>
          ) : null}
          {isDirty ? (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              저장되지 않은 변경사항이 있습니다.
            </p>
          ) : null}
        </div>

        <BannerPreview form={form} />

        <form onSubmit={saveBanner} className="grid gap-5 rounded-md border bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="토픽">
              <Input
                aria-label="토픽"
                value={form.topic}
                onChange={(event) => updateForm("topic", event.target.value)}
                maxLength={40}
                placeholder="비워두면 노출하지 않음"
              />
            </Field>
            <Field label="링크">
              <div className="grid grid-cols-[auto_1fr] items-center rounded-md border bg-white px-3">
                <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  aria-label="링크"
                  value={form.linkPath}
                  onChange={(event) => updateForm("linkPath", event.target.value)}
                  aria-describedby="admin-banner-link-help"
                  className="h-11 min-w-0 border-0 bg-transparent px-2 text-sm outline-none"
                  required
                  placeholder="/products/glow-set"
                />
              </div>
              <p id="admin-banner-link-help" className="text-xs leading-5 text-muted-foreground">
                내부 경로만 가능: /shop, /products/...
              </p>
            </Field>
            <Field label="큰 글" className="md:col-span-2">
              <Input
                aria-label="큰 글"
                value={form.headline}
                onChange={(event) => updateForm("headline", event.target.value)}
                maxLength={90}
                placeholder="비워두면 노출하지 않음"
              />
            </Field>
            <Field label="작은 설명글" className="md:col-span-2">
              <Textarea
                aria-label="작은 설명글"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                maxLength={180}
                rows={3}
                placeholder="비워두면 노출하지 않음"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ImagePathField
              label="배너 배경 사진"
              value={form.backgroundImagePath}
              required
              uploadState={uploadTarget === "backgroundImagePath" ? saveState : "idle"}
              onChange={(value) => updateForm("backgroundImagePath", value)}
              onUpload={(file) => uploadBannerImage("backgroundImagePath", file)}
            />
            <ImagePathField
              label="보조 상품 사진"
              value={form.sideImagePath}
              uploadState={uploadTarget === "sideImagePath" ? saveState : "idle"}
              onChange={(value) => updateForm("sideImagePath", value)}
              onUpload={(file) => uploadBannerImage("sideImagePath", file)}
              onClear={() => updateForm("sideImagePath", "")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)]">
            <Field label="폰트">
              <select
                aria-label="폰트"
                value={form.fontKey}
                onChange={(event) => updateForm("fontKey", event.target.value as HomeBannerFontKey)}
                className="focus-ring h-11 w-full rounded-md border bg-white px-3 text-sm"
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="토픽 색상">
              <TextColorPicker
                name="topicTextColor"
                label="토픽 색상"
                value={form.topicTextColor}
                onChange={(value) => updateForm("topicTextColor", value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="큰 글 색상">
              <TextColorPicker
                name="headlineTextColor"
                label="큰 글 색상"
                value={form.headlineTextColor}
                onChange={(value) => updateForm("headlineTextColor", value)}
              />
            </Field>
            <Field label="작은 설명글 색상">
              <TextColorPicker
                name="descriptionTextColor"
                label="작은 설명글 색상"
                value={form.descriptionTextColor}
                onChange={(value) => updateForm("descriptionTextColor", value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3")}
              onClick={startCreate}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              새로 작성
            </button>
            <Button type="submit" disabled={isBusy}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saveState === "saving" ? "저장 중" : isNewBanner ? "등록" : "저장"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BannerPreview({ form }: { form: BannerFormState }) {
  const topicColor = textColorClassByKey[form.topicTextColor];
  const headlineColor = textColorClassByKey[form.headlineTextColor];
  const descriptionColor = textColorClassByKey[form.descriptionTextColor];
  const hasBackground = Boolean(form.backgroundImagePath.trim());
  const hasSideImage = Boolean(form.sideImagePath.trim());
  const hasTopic = Boolean(form.topic.trim());
  const hasHeadline = Boolean(form.headline.trim());
  const hasDescription = Boolean(form.description.trim());
  const hasCopy = hasTopic || hasHeadline || hasDescription;

  return (
    <section className="overflow-hidden rounded-md border bg-white">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h4 className="text-sm font-bold">홈 노출 미리보기</h4>
        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="relative min-h-[20rem] overflow-hidden bg-[#fff8f0]">
        {hasBackground ? (
          <>
            <Image
              src={form.backgroundImagePath}
              alt=""
              fill
              {...getImageOptimizationProps(form.backgroundImagePath)}
              sizes="(min-width: 1280px) 54vw, 100vw"
              className="object-cover"
            />
            {hasCopy ? <div className={cn("absolute inset-0", headlineColor.overlay)} aria-hidden="true" /> : null}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-muted text-sm font-semibold text-muted-foreground">
            배경 사진 필요
          </div>
        )}
        <div
          className={cn(
            "relative z-10 grid min-h-[20rem] gap-5 p-6 md:p-8",
            hasCopy && hasSideImage ? "md:grid-cols-[0.95fr_1.05fr] md:items-center" : "md:max-w-2xl md:items-center"
          )}
        >
          {hasCopy ? (
            <div>
              {hasTopic ? (
                <p className={cn("text-sm uppercase", fontClassByKey[form.fontKey], topicColor.eyebrow)}>
                  {form.topic}
                </p>
              ) : null}
              {hasHeadline ? (
                <h5
                  className={cn(
                    hasTopic ? "mt-5" : "",
                    "max-w-[13ch] text-4xl leading-[1.08] tracking-normal [word-break:keep-all] md:text-5xl",
                    fontClassByKey[form.fontKey],
                    headlineColor.headline
                  )}
                >
                  {form.headline}
                </h5>
              ) : null}
              {hasDescription ? (
                <p
                  className={cn(
                    hasTopic || hasHeadline ? "mt-4" : "",
                    "max-w-[34rem] text-base font-bold leading-7",
                    descriptionColor.body
                  )}
                >
                  {getBalancedBannerTextLines(form.description).map((line, index) => (
                    <span className="block" key={`${index}-${line}`}>
                      {line}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}
          {hasSideImage ? (
            <div className="relative min-h-[16rem] overflow-hidden rounded-md">
              <Image
                src={form.sideImagePath}
                alt=""
                fill
                {...getImageOptimizationProps(form.sideImagePath)}
                sizes="(min-width: 1280px) 28vw, 100vw"
                className="object-contain"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TextColorPicker({
  name,
  label,
  value,
  onChange
}: {
  name: string;
  label: string;
  value: HomeBannerTextColor;
  onChange: (value: HomeBannerTextColor) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {textColorOptions.map((option) => (
        <label
          key={option.value}
          className={cn(
            "focus-within:ring-ring inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold",
            value === option.value ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"
          )}
        >
          <input
            type="radio"
            name={name}
            aria-label={`${label} ${option.label}`}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <span
            className="h-4 w-4 rounded-full border"
            style={{ backgroundColor: option.swatch }}
            aria-hidden="true"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function ImagePathField({
  label,
  value,
  required = false,
  uploadState,
  onChange,
  onUpload,
  onClear
}: {
  label: string;
  value: string;
  required?: boolean;
  uploadState: SaveState;
  onChange: (value: string) => void;
  onUpload: (file: File | undefined) => void;
  onClear?: () => void;
}) {
  return (
    <Field label={label}>
      <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
        <div className="relative min-h-44 overflow-hidden rounded-md border bg-white">
          {value ? (
            <Image
              src={value}
              alt=""
              fill
              {...getImageOptimizationProps(value)}
              sizes="(min-width: 768px) 30vw, 90vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full min-h-44 place-items-center text-sm font-semibold text-muted-foreground">
              {required ? "이미지를 등록해주세요." : "선택 이미지 없음"}
            </div>
          )}
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <Input
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            required={required}
            placeholder={required ? "업로드 또는 내부 이미지 경로" : "선택 사항"}
          />
          <label
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 cursor-pointer bg-white px-3",
              uploadState === "saving" && "pointer-events-none opacity-60"
            )}
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {uploadState === "saving" ? "업로드 중" : "업로드"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploadState === "saving"}
              onChange={(event) => onUpload(event.target.files?.[0])}
            />
          </label>
          {onClear ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-11 bg-white px-3")}
              onClick={onClear}
              aria-label={`${label} 비우기`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              비우기
            </button>
          ) : null}
        </div>
      </div>
    </Field>
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
    <div className={cn("grid gap-2 text-sm font-semibold", className)}>
      <span>{label}</span>
      {children}
    </div>
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

function toBannerForm(banner: HomeBanner | null | undefined): BannerFormState {
  return {
    topic: banner?.topic ?? "",
    headline: banner?.headline ?? "",
    description: banner?.description ?? "",
    backgroundImagePath: banner?.backgroundImagePath ?? "",
    sideImagePath: banner?.sideImagePath ?? "",
    linkPath: banner?.linkPath ?? "/shop",
    fontKey: banner?.fontKey ?? "brand-display",
    topicTextColor: banner?.topicTextColor ?? banner?.textColor ?? "black",
    headlineTextColor: banner?.headlineTextColor ?? banner?.textColor ?? "black",
    descriptionTextColor: banner?.descriptionTextColor ?? banner?.textColor ?? "black"
  };
}

function toBannerPayload(form: BannerFormState) {
  return {
    topic: form.topic,
    headline: form.headline,
    description: form.description,
    backgroundImagePath: form.backgroundImagePath,
    sideImagePath: form.sideImagePath.trim() || undefined,
    linkPath: form.linkPath,
    fontKey: form.fontKey,
    textColor: form.headlineTextColor,
    topicTextColor: form.topicTextColor,
    headlineTextColor: form.headlineTextColor,
    descriptionTextColor: form.descriptionTextColor
  };
}

function sortBanners(banners: HomeBanner[]) {
  return [...banners].sort((first, second) => first.sortOrder - second.sortOrder);
}

function getBannerListTopic(banner: HomeBanner) {
  return banner.topic.trim() || "이미지 배너";
}

function getBannerListTitle(banner: HomeBanner) {
  return banner.headline.trim() || banner.description.trim() || banner.topic.trim() || "이미지 배너";
}

function areBannerFormsEqual(first: BannerFormState, second: BannerFormState) {
  return (
    first.topic === second.topic &&
    first.headline === second.headline &&
    first.description === second.description &&
    first.backgroundImagePath === second.backgroundImagePath &&
    first.sideImagePath === second.sideImagePath &&
    first.linkPath === second.linkPath &&
    first.fontKey === second.fontKey &&
    first.topicTextColor === second.topicTextColor &&
    first.headlineTextColor === second.headlineTextColor &&
    first.descriptionTextColor === second.descriptionTextColor
  );
}

function isClientInternalLinkPath(value: string) {
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("://") ||
    /[\s\\]/.test(trimmed)
  ) {
    return false;
  }

  try {
    const url = new URL(trimmed, "https://ship-k.local");
    return url.origin === "https://ship-k.local" && url.pathname.startsWith("/");
  } catch {
    return false;
  }
}
