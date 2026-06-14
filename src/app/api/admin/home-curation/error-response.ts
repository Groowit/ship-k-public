import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminRequiredError, AuthRequiredError } from "@/lib/auth";
import {
  HomeCurationDuplicateProductError,
  HomeCurationOrderError,
  HomeCurationSetupRequiredError
} from "@/lib/home-curation";
import { UnsafeRequestOriginError } from "@/lib/request-guard";

export function adminHomeCurationErrorResponse(error: unknown, fallbackMessage: string) {
  if (
    error instanceof AuthRequiredError ||
    error instanceof AdminRequiredError ||
    error instanceof UnsafeRequestOriginError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid curation payload" },
      { status: 400 }
    );
  }

  if (
    error instanceof HomeCurationSetupRequiredError ||
    error instanceof HomeCurationDuplicateProductError ||
    error instanceof HomeCurationOrderError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 400 }
  );
}
