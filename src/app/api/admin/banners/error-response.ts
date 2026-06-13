import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminRequiredError, AuthRequiredError } from "@/lib/auth";
import { HomeBannerSetupRequiredError } from "@/lib/home-banners";
import { UnsafeRequestOriginError } from "@/lib/request-guard";

export function adminBannerErrorResponse(error: unknown, fallbackMessage: string) {
  if (
    error instanceof AuthRequiredError ||
    error instanceof AdminRequiredError ||
    error instanceof UnsafeRequestOriginError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid banner payload" },
      { status: 400 }
    );
  }

  if (error instanceof HomeBannerSetupRequiredError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 400 }
  );
}
