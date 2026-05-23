import { NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const verification = await verifyPayPalWebhook({
      transmissionId: request.headers.get("paypal-transmission-id"),
      transmissionTime: request.headers.get("paypal-transmission-time"),
      certUrl: request.headers.get("paypal-cert-url"),
      authAlgo: request.headers.get("paypal-auth-algo"),
      transmissionSig: request.headers.get("paypal-transmission-sig"),
      webhookEvent: payload
    });

    if (verification.verification_status !== "SUCCESS") {
      return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
    }

    return NextResponse.json({
      received: true,
      eventId: payload.id ?? null,
      eventType: payload.event_type ?? null
    });
  } catch {
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }
}
