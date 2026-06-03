"use client";

import Lenis from "lenis";
import { useEffect } from "react";

export function AboutScrollExperience({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rootElement: HTMLElement | null = null;
    let lenis: Lenis | null = null;
    let animationFrame = 0;
    let measurementTimeout = 0;

    function getRootElement() {
      rootElement ??= document.querySelector<HTMLElement>(".about-redesign-scroll");

      return rootElement;
    }

    function updateExperienceVariables() {
      const currentRootElement = getRootElement();

      if (!currentRootElement) {
        return;
      }

      const heroElement = document.querySelector<HTMLElement>(".about-redesign-hero");

      if (heroElement) {
        const heroRect = heroElement.getBoundingClientRect();
        const heroProgress = clamp(-heroRect.top / Math.max(1, heroRect.height), 0, 1);
        currentRootElement.style.setProperty("--about-hero-progress", heroProgress.toFixed(4));
        currentRootElement.style.setProperty(
          "--about-hero-y",
          `${(-heroProgress * 3).toFixed(2)}rem`
        );
        currentRootElement.style.setProperty(
          "--about-hero-copy-y",
          `${(-heroProgress * 1.25).toFixed(2)}rem`
        );
        currentRootElement.style.setProperty(
          "--about-hero-scale",
          (1.05 + heroProgress * 0.06).toFixed(4)
        );
        currentRootElement.style.setProperty(
          "--about-hero-copy-scale",
          (1 - heroProgress * 0.035).toFixed(4)
        );
        currentRootElement.style.setProperty(
          "--about-hero-copy-opacity",
          (1 - heroProgress * 0.62).toFixed(4)
        );
        currentRootElement.style.setProperty(
          "--about-hero-rotate",
          `${(heroProgress * 18).toFixed(2)}deg`
        );
      }

      const storyElement = document.querySelector<HTMLElement>(".about-redesign-story");

      if (storyElement) {
        const storyRect = storyElement.getBoundingClientRect();
        const storyProgress = clamp(
          (window.innerHeight - storyRect.top) /
            Math.max(1, storyRect.height + window.innerHeight * 0.35),
          0,
          1
        );

        currentRootElement.style.setProperty("--about-story-progress", storyProgress.toFixed(4));
        currentRootElement.style.setProperty(
          "--about-story-copy-y",
          `${(-storyProgress * 1.15).toFixed(2)}rem`
        );
        currentRootElement.style.setProperty(
          "--about-routine-image-y",
          `${(-storyProgress * 1.8).toFixed(2)}rem`
        );
        currentRootElement.style.setProperty(
          "--about-routine-image-scale",
          (1.02 + storyProgress * 0.045).toFixed(4)
        );
        currentRootElement.style.setProperty(
          "--about-routine-sheen-x",
          `${(-34 + storyProgress * 72).toFixed(2)}%`
        );
        currentRootElement.style.setProperty(
          "--about-routine-sheen-opacity",
          (0.08 + storyProgress * 0.18).toFixed(4)
        );
      }

      updateRevealElements();
      currentRootElement.dataset.motionReady = "true";
    }

    function updateRevealElements() {
      const viewportHeight = window.innerHeight;

      document.querySelectorAll<HTMLElement>(".about-reveal").forEach((element) => {
        const rect = element.getBoundingClientRect();
        const reveal = clamp(
          (viewportHeight * 0.92 - rect.top) / Math.max(1, viewportHeight * 0.32),
          0,
          1
        );

        element.style.setProperty("--about-reveal-opacity", (0.68 + reveal * 0.32).toFixed(4));
        element.style.setProperty("--about-reveal-y", `${((1 - reveal) * 1.1).toFixed(2)}rem`);
        element.style.setProperty("--about-reveal-scale", (0.992 + reveal * 0.008).toFixed(4));
      });

      document.querySelectorAll<HTMLElement>(".about-redesign-story-card").forEach((card) => {
        const rect = card.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const presence = clamp(
          1 - Math.abs(center - viewportHeight * 0.54) / Math.max(1, viewportHeight * 0.72),
          0,
          1
        );
        const reveal = clamp(
          (viewportHeight * 0.9 - rect.top) / Math.max(1, viewportHeight * 0.28),
          0,
          1
        );

        card.style.setProperty("--about-card-opacity", (0.68 + reveal * 0.32).toFixed(4));
        card.style.setProperty(
          "--about-card-y",
          `${((1 - reveal) * 2.35 - presence * 0.28).toFixed(2)}rem`
        );
        card.style.setProperty("--about-card-scale", (0.982 + presence * 0.018).toFixed(4));
        card.style.setProperty("--about-card-image-scale", (1.015 + presence * 0.055).toFixed(4));
        card.style.setProperty(
          "--about-card-shadow-opacity",
          (0.04 + presence * 0.12).toFixed(4)
        );
        card.style.setProperty("--about-card-border-alpha", (0.82 + presence * 0.18).toFixed(4));
      });
    }

    function stopLenis() {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }

      if (measurementTimeout) {
        window.clearTimeout(measurementTimeout);
        measurementTimeout = 0;
      }

      window.removeEventListener("resize", updateExperienceVariables);
      window.removeEventListener("scroll", updateExperienceVariables);
      getRootElement()?.removeAttribute("data-motion-ready");
      lenis?.destroy();
      lenis = null;
      cleanupLenisAttributes();
    }

    function startLenis() {
      stopLenis();
      window.addEventListener("resize", updateExperienceVariables);
      window.addEventListener("scroll", updateExperienceVariables, { passive: true });
      measurementTimeout = window.setTimeout(updateExperienceVariables, 80);

      if (motionQuery.matches) {
        updateExperienceVariables();
        return;
      }

      lenis = new Lenis({
        anchors: true,
        duration: 1.18,
        lerp: 0.075,
        smoothWheel: true,
        syncTouch: false,
        stopInertiaOnNavigate: true
      });

      const animate = (time: number) => {
        lenis?.raf(time);
        updateExperienceVariables();
        animationFrame = window.requestAnimationFrame(animate);
      };

      updateExperienceVariables();
      animationFrame = window.requestAnimationFrame(animate);
    }

    startLenis();

    motionQuery.addEventListener("change", startLenis);

    return () => {
      motionQuery.removeEventListener("change", startLenis);
      stopLenis();
    };
  }, []);

  return <div className="about-redesign-scroll">{children}</div>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanupLenisAttributes() {
  const rootElement = document.documentElement;
  const bodyElement = document.body;

  rootElement.classList.remove(
    "lenis",
    "lenis-smooth",
    "lenis-scrolling",
    "lenis-stopped",
    "lenis-snap"
  );

  if (rootElement.getAttribute("style") === "") {
    rootElement.removeAttribute("style");
  }

  if (bodyElement.getAttribute("style") === "") {
    bodyElement.removeAttribute("style");
  }
}
