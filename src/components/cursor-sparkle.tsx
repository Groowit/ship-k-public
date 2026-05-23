"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const sparkleChars = ["★", "♥", "✦", "✧"];
const sparklePalette = ["#ff3d7f", "#ffe25a", "#c8f26c", "#bde0fe", "#ff7a5c"];

export function CursorSparkle() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    if (prefersReducedMotion.matches || !finePointer.matches) {
      return;
    }

    let lastSparkleAt = 0;
    const activeSparkles = new Set<HTMLSpanElement>();
    const removalTimers = new Set<number>();

    const handlePointerMove = (event: PointerEvent) => {
      const now = Date.now();
      if (now - lastSparkleAt < 90) {
        return;
      }

      lastSparkleAt = now;
      const sparkle = document.createElement("span");
      sparkle.className = "shipk-cursor-sparkle";
      sparkle.setAttribute("aria-hidden", "true");
      sparkle.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
      sparkle.style.left = `${event.clientX + Math.random() * 20 - 10}px`;
      sparkle.style.top = `${event.clientY + Math.random() * 20 - 10}px`;
      sparkle.style.fontSize = `${12 + Math.random() * 10}px`;
      sparkle.style.color =
        sparklePalette[Math.floor(Math.random() * sparklePalette.length)];

      activeSparkles.add(sparkle);
      document.body.appendChild(sparkle);

      const timer = window.setTimeout(() => {
        activeSparkles.delete(sparkle);
        removalTimers.delete(timer);
        sparkle.remove();
      }, 800);
      removalTimers.add(timer);
    };

    document.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      removalTimers.forEach((timer) => window.clearTimeout(timer));
      activeSparkles.forEach((sparkle) => sparkle.remove());
      removalTimers.clear();
      activeSparkles.clear();
    };
  }, [pathname]);

  return null;
}
