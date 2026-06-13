"use client";

import { Archive, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MutationState = "idle" | "running" | "done";

export function AdminProductDeleteButton({
  productId,
  productName,
  className
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  return (
    <AdminProductMutationButton
      productId={productId}
      productName={productName}
      className={className}
      actionLabel="삭제"
      runningLabel="삭제 중"
      doneLabel="삭제됨"
      confirmMessage={`${productName} 상품을 완전히 삭제할까요? 삭제하면 DB에서 제거되어 복구할 수 없습니다.`}
      errorMessage="상품을 삭제하지 못했습니다."
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
      requestInit={{ method: "DELETE" }}
      variant="destructive"
    />
  );
}

export function AdminProductHideButton({
  productId,
  productName,
  className
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  return (
    <AdminProductMutationButton
      productId={productId}
      productName={productName}
      className={className}
      actionLabel="숨기기"
      runningLabel="숨기는 중"
      doneLabel="숨김"
      confirmMessage={`${productName} 상품을 숨길까요? 공개 상품 목록에서는 보이지 않고 보관됨 상태로 바뀝니다.`}
      errorMessage="상품을 숨기지 못했습니다."
      icon={<Archive className="h-3.5 w-3.5" aria-hidden="true" />}
      requestInit={{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" })
      }}
      variant="outline"
    />
  );
}

function AdminProductMutationButton({
  productId,
  productName,
  className,
  actionLabel,
  runningLabel,
  doneLabel,
  confirmMessage,
  errorMessage,
  icon,
  requestInit,
  variant
}: {
  productId: string;
  productName: string;
  className?: string;
  actionLabel: string;
  runningLabel: string;
  doneLabel: string;
  confirmMessage: string;
  errorMessage: string;
  icon: React.ReactNode;
  requestInit: RequestInit;
  variant: "outline" | "destructive";
}) {
  const router = useRouter();
  const [mutationState, setMutationState] = useState<MutationState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function runProductMutation() {
    if (mutationState === "running") {
      return;
    }

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    setMutationState("running");
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, requestInit);

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, errorMessage));
      }

      setMutationState("done");
      router.refresh();
    } catch (caughtError) {
      setMutationState("idle");
      setError(caughtError instanceof Error ? caughtError.message : errorMessage);
    }
  }

  return (
    <div className="grid gap-1">
      <Button
        type="button"
        variant={variant}
        size="sm"
        className={cn("w-full", className)}
        disabled={mutationState !== "idle"}
        onClick={runProductMutation}
        aria-label={`${productName} ${actionLabel}`}
      >
        {icon}
        {mutationState === "running" ? runningLabel : mutationState === "done" ? doneLabel : actionLabel}
      </Button>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();

    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
