"use client";

import { useEffect, useRef } from "react";
import { createGalaxyEngine, pickQuality, type GalaxyEngine, type PortalVars } from "./galaxy-engine";
import styles from "./galaxy-intro.module.css";

const LEFT_LETTERS = ["A", "D", "M", "I", "T"] as const;

/**
 * id of the zero-height marker this component renders directly after the intro
 * section, i.e. directly before <LandingPage />. The "Skip intro" link targets it.
 * It is rendered here (not assumed to exist inside LandingPage) so the target is
 * guaranteed to be in the DOM whenever the skip link is.
 */
const LANDING_START_ID = "admitos-landing-start";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Additive cinematic opening for the landing page.
 *
 * A fixed, cinematic overlay sits above the real homepage. Tap to focus the galaxy;
 * a later downward scroll softly dissolves the overlay and reveals the homepage beneath it.
 *
 * All high-frequency work (particles, rotation, scroll smoothing) happens in the
 * engine on a canvas. This component renders once and never re-renders: runtime
 * state is exposed to CSS through data-* attributes and custom properties.
 *
 * The intro is intentionally not persisted: refreshing always starts at the wordmark.
 */
export function GalaxyIntro() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordmarkRef = useRef<HTMLParagraphElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const hitRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const wordmark = wordmarkRef.current;
    const slot = slotRef.current;
    const hit = hitRef.current;
    const skip = skipRef.current;
    if (!root || !stage || !canvas || !wordmark || !slot || !hit || !skip) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quality = pickQuality();
    let disposed = false;
    let focused = false;
    let touchStartY: number | null = null;
    let revealTimer = 0;
    let activeEngine: GalaxyEngine | null = null;
    let inView = true;
    let hoverAttached = false;
    let measureQueued = 0;
    // Replaced by the full teardown once everything exists. Until then (the canvas-failure
    // path) it only has to detach the skip link, because nothing else was created.
    let cleanup: () => void = () => {
      disposed = true;
      skip.removeEventListener("click", leaveIntro);
    };

    const focusGalaxy = () => {
      if (focused || disposed) return;
      focused = true;
      root.dataset.focused = "true";
      activeEngine?.setProgress(1);
    };

    // Fade the fixed intro overlay away; the real homepage is already underneath it.
    const revealLanding = () => {
      if (root.dataset.leaving === "true") return;
      root.dataset.leaving = "true";
      root.style.pointerEvents = "none";
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        cleanup();
        root.style.display = "none";
        window.scrollTo(0, 0);
      }, reduced ? 0 : 760);
    };

    const leaveIntro = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      revealLanding();
    };

    const showFallback = () => {
      root.dataset.engine = "failed";
      root.dataset.mode = "static";
      root.dataset.formed = "true";
    };

    const onVars = (vars: PortalVars) => {
      if (disposed) return;
      // All arithmetic happens here so the stylesheet only ever reads finished values.
      const style = root.style;
      style.setProperty("--nebula", "1");
      style.setProperty("--wm-opacity", clamp01(1 - vars.text * 1.2).toFixed(3));
      style.setProperty("--wm-blur", `${(vars.text * 10).toFixed(2)}px`);
      style.setProperty("--wm-shift-left", `${(vars.text * -22).toFixed(2)}vw`);
      style.setProperty("--wm-shift-right", `${(vars.text * 22).toFixed(2)}vw`);
      style.setProperty("--cue", clamp01(1 - vars.text * 4).toFixed(3));
      style.setProperty("--veil", vars.veil.toFixed(3));
      style.setProperty("--canvas", vars.canvas.toFixed(3));
      root.dataset.portal = "false";
      root.dataset.done = "false";
    };

    let created: GalaxyEngine;
    try {
      created = createGalaxyEngine({
        canvas,
        quality,
        reducedMotion: reduced,
        onFormed: () => {
          if (!disposed) root.dataset.formed = "true";
        },
        onVars,
      });
    } catch {
      // Canvas unavailable or init failed: show the compact static screen and keep the homepage usable.
      showFallback();
      skip.addEventListener("click", leaveIntro);
      return () => cleanup();
    }
    const engine = created;
    activeEngine = engine;

    // The first downward gesture focuses the galaxy; further scrolling is native.
    const updateProgress = () => engine.setProgress(focused ? 1 : 0);

    // ---- geometry: stage size, DPR and the "O" slot position
    const measure = () => {
      measureQueued = 0;
      if (disposed) return;
      const stageRect = stage.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, quality.dprMax);
      engine.resize(stageRect.width, stageRect.height, dpr);
      engine.setSlot(
        slotRect.left - stageRect.left + slotRect.width / 2,
        slotRect.top - stageRect.top + slotRect.height / 2,
        slotRect.width,
      );
      updateProgress();
    };
    const queueMeasure = () => {
      if (disposed || measureQueued !== 0) return;
      measureQueued = requestAnimationFrame(measure);
    };

    const onScroll = () => {
      if (window.scrollY > 0) {
        window.scrollTo(0, 0);
        if (focused) revealLanding();
        else focusGalaxy();
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) return;
      event.preventDefault();
      if (!focused) focusGalaxy();
      else revealLanding();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (touchStartY === null || currentY === undefined || currentY >= touchStartY - 10) return;
      event.preventDefault();
      if (!focused) focusGalaxy();
      else revealLanding();
      touchStartY = null;
    };
    const onActivate = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a")) return;
      focusGalaxy();
    };

    // ---- drag to rotate (Pointer Events: mouse, touch and pen share one path)
    let activePointer: number | null = null;
    let draggingPointer = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    const endDrag = () => {
      if (activePointer === null) return;
      if (draggingPointer) {
        try {
          hit.releasePointerCapture(activePointer);
        } catch {
          // pointer already released
        }
        engine.dragEnd();
      }
      activePointer = null;
      draggingPointer = false;
      delete hit.dataset.dragging;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (activePointer !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      activePointer = event.pointerId;
      draggingPointer = event.pointerType !== "touch";
      lastX = event.clientX;
      lastY = event.clientY;
      lastT = event.timeStamp;
      // Touch waits for a clear horizontal intent before capturing the pointer. This lets
      // ordinary vertical swipes scroll the page instead of rotating the galaxy.
      if (!draggingPointer) return;
      try {
        hit.setPointerCapture(event.pointerId); // pointerup is delivered even outside the galaxy
      } catch {
        // capture unsupported: pointerup/cancel handlers still end the drag
      }
      hit.dataset.dragging = "true";
      engine.dragStart();
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (!draggingPointer) {
        if (Math.abs(dy) >= 8 && Math.abs(dy) > Math.abs(dx)) {
          // Yield to native vertical scrolling; pointercancel may follow and is harmless.
          activePointer = null;
          return;
        }
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
        draggingPointer = true;
        try {
          hit.setPointerCapture(event.pointerId);
        } catch {
          // Capture is an optimization; pointer end events still clean up.
        }
        hit.dataset.dragging = "true";
        engine.dragStart();
      }
      engine.dragMove(dx, dy, event.timeStamp - lastT);
      lastX = event.clientX;
      lastY = event.clientY;
      lastT = event.timeStamp;
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId === activePointer) endDrag();
    };
    const onVisibility = () => {
      if (document.hidden) endDrag();
    };
    const suppress = (event: Event) => event.preventDefault();

    // ---- subtle mouse parallax for the star field (fine pointers only).
    // Attached only while the intro is on screen so it adds no per-pointermove cost
    // to the landing page once the visitor has scrolled past.
    const onHover = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      engine.setParallax(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5);
    };
    const setHover = (attach: boolean) => {
      if (attach === hoverAttached) return;
      hoverAttached = attach;
      if (attach) window.addEventListener("pointermove", onHover, { passive: true });
      else window.removeEventListener("pointermove", onHover);
    };

    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    const teardown = () => {
      if (disposed) return;
      disposed = true;
      if (measureQueued !== 0) cancelAnimationFrame(measureQueued);
      window.clearTimeout(revealTimer);
      measureQueued = 0;
      endDrag();
      engine.dispose();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      setHover(false);
      hit.removeEventListener("pointerdown", onPointerDown);
      hit.removeEventListener("pointermove", onPointerMove);
      hit.removeEventListener("pointerup", onPointerEnd);
      hit.removeEventListener("pointercancel", onPointerEnd);
      hit.removeEventListener("lostpointercapture", onPointerEnd);
      hit.removeEventListener("contextmenu", suppress);
      hit.removeEventListener("dragstart", suppress);
      skip.removeEventListener("click", leaveIntro);
      window.removeEventListener("blur", endDrag);
      window.removeEventListener("scroll", onScroll);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("click", onActivate);
      window.removeEventListener("orientationchange", queueMeasure);
      document.removeEventListener("visibilitychange", onVisibility);
    };

    hit.addEventListener("pointerdown", onPointerDown);
    hit.addEventListener("pointermove", onPointerMove);
    hit.addEventListener("pointerup", onPointerEnd);
    hit.addEventListener("pointercancel", onPointerEnd);
    hit.addEventListener("lostpointercapture", onPointerEnd);
    hit.addEventListener("contextmenu", suppress);
    hit.addEventListener("dragstart", suppress);
    skip.addEventListener("click", leaveIntro);
    window.addEventListener("blur", endDrag);
    window.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("click", onActivate);
    window.addEventListener("orientationchange", queueMeasure);
    document.addEventListener("visibilitychange", onVisibility);
    setHover(true);
    cleanup = teardown;

    // Observer APIs are expected in modern browsers, but constructor/observe failures must
    // not strand listeners or the engine. Tear everything down before enabling static fallback.
    try {
      resizeObserver = new ResizeObserver(queueMeasure);
      resizeObserver.observe(stage);
      resizeObserver.observe(wordmark);

      // Do no work while the intro is off-screen (e.g. the visitor is deep in the page).
      // Several records can be batched into one callback; the last one is the most recent.
      intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry || disposed) return;
        inView = entry.isIntersecting;
        root.dataset.offscreen = inView ? "false" : "true";
        engine.setVisible(inView);
        setHover(inView);
        updateProgress(); // also catches "restored far below the intro" -> counts as completed
      });
      intersectionObserver.observe(root);
    } catch {
      teardown();
      showFallback();
      skip.addEventListener("click", leaveIntro);
      return () => cleanup();
    }

    // The brand font can load after first paint and move the slot. The promise cannot be
    // cancelled, so the callback itself refuses to schedule anything after disposal.
    if (typeof document.fonts !== "undefined") {
      void document.fonts.ready.then(() => {
        if (!disposed) queueMeasure();
      });
    }

    measure();
    engine.start();
    cleanup = teardown;
    return () => cleanup(); // idempotent: safe if leaveIntro() already ran it
  }, []);

  return (
    <>
      <section
        ref={rootRef}
        className={styles.root}
        aria-label="AdmitOS introduction"
        data-formed="false"
        data-focused="false"
        data-portal="false"
        data-done="false"
        data-mode="animated"
        data-engine="ok"
      >
        <noscript>
          {/* Without JS the cinematic sequence cannot run, so don't show a dead dark screen. */}
          <style>{`.${styles.root}{display:none}`}</style>
        </noscript>
        <div className={styles.stage} ref={stageRef}>
          <div className={styles.nebula} aria-hidden="true" />
          <div className={styles.starfield} aria-hidden="true" />
          <div className={styles.shootingStars} aria-hidden="true" />
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />

          <div className={styles.content}>
            <span className={styles.srOnly}>AdmitOS</span>
            <p className={styles.wordmark} ref={wordmarkRef} aria-hidden="true">
              <span className={styles.left}>
                {LEFT_LETTERS.map((letter, index) => (
                  <span
                    key={letter + index}
                    className={styles.letter}
                    style={{ animationDelay: `${(0.35 + index * 0.09).toFixed(2)}s` }}
                  >
                    {letter}
                  </span>
                ))}
              </span>
              <span className={styles.slot} ref={slotRef}>
                <span className={styles.fallback} />
                <span className={styles.hit} ref={hitRef} />
              </span>
              <span className={styles.right}>
                <span className={styles.letterS}>S</span>
              </span>
            </p>
          </div>

          <div className={styles.veil} aria-hidden="true" />

          <a className={styles.skip} href={`#${LANDING_START_ID}`} ref={skipRef}>
            Skip intro
          </a>
          <div className={styles.cue} aria-hidden="true">
            <div className={styles.cueInner}>
              <span>Tap or scroll to explore</span>
              <span className={styles.chevron} />
            </div>
          </div>
        </div>
      </section>
      {/* Skip target. Sits between the intro and <LandingPage />; focusable only programmatically. */}
      <div id={LANDING_START_ID} className={styles.landingStart} tabIndex={-1} />
    </>
  );
}
