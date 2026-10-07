/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 60;
const MAX_PULL = 100;
const HOLD_PULL = 48;

function findScroller(el) {
  let node = el ? el.parentElement : null;
  while (node) {
    if (node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

// Pull-to-refresh wrapper. Tracks a downward touch drag only when the
// surrounding scroll container sits at the top; past ~60px it calls
// onRefresh() and spins until the promise settles. Touch-only: on desktop
// no touch events fire and mouse scrolling is untouched.
//
// Performance: the pull distance lives in a ref (never in state), DOM
// writes go through exactly one requestAnimationFrame at a time, and the
// drag uses direct style mutation so no React render happens mid-gesture.
// The displacement uses rubber-band easing and caps at ~100px. The snap
// back / hold positions animate via a CSS transform transition that is
// removed while dragging so the drag stays 1:1. Must be paired with
// `overscroll-behavior` so the browser's native pull-to-refresh doesn't
// fight the gesture.
const PullToRefresh = ({ onRefresh, children }) => {
  const wrapRef = useRef(null);
  const contentRef = useRef(null);
  const indicatorRef = useRef(null);
  const track = useRef({ active: false, startY: 0, raw: 0, effective: 0, raf: 0 });
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const t0 = track.current;

    // Single paint path: content slides down, the spinner fades/scales in.
    const paint = (effective) => {
      const content = contentRef.current;
      if (content) {
        content.style.transform = effective > 0 ? `translateY(${effective}px)` : "";
      }
      const ind = indicatorRef.current;
      if (ind) {
        const show = effective > 2 || refreshingRef.current;
        ind.style.opacity = show ? "1" : "0";
        const scaleTarget = refreshingRef.current ? 1 : Math.min(1, effective / THRESHOLD);
        ind.style.transform = `scale(${scaleTarget})`;
      }
    };

    const schedulePaint = () => {
      if (t0.raf) return;
      t0.raf = requestAnimationFrame(() => {
        t0.raf = 0;
        paint(t0.effective);
      });
    };

    const setSliding = (on) => {
      const content = contentRef.current;
      if (content) {
        content.style.transition = on ? "transform 0.25s ease" : "none";
      }
    };

    const onTouchStart = (e) => {
      if (refreshingRef.current || e.touches.length !== 1) {
        track.current.active = false;
        return;
      }
      const scroller = findScroller(el);
      if (scroller && scroller.scrollTop <= 0) {
        track.current.active = true;
        track.current.startY = e.touches[0].clientY;
        track.current.raw = 0;
        track.current.effective = 0;
        // 1:1 drag — no transition while the finger is down.
        setSliding(false);
      } else {
        track.current.active = false;
      }
    };

    const onTouchMove = (e) => {
      const t = track.current;
      if (!t.active || refreshingRef.current) return;
      const dy = e.touches[0].clientY - t.startY;
      if (dy <= 0) {
        if (t.effective !== 0) {
          t.raw = 0;
          t.effective = 0;
          schedulePaint();
        }
        return;
      }
      // Never hijack a scroll that has moved off the top mid-gesture.
      const scroller = findScroller(el);
      if (scroller && scroller.scrollTop > 0) {
        t.active = false;
        t.raw = 0;
        t.effective = 0;
        schedulePaint();
        return;
      }
      if (e.cancelable) e.preventDefault();
      t.raw = dy;
      // Rubber-band easing: the pull decelerates as it grows.
      t.effective = Math.min(dy * (1 - dy / (dy + 200)), MAX_PULL);
      schedulePaint();
    };

    const finish = (trigger) => {
      const t = track.current;
      const wasActive = t.active;
      t.active = false;
      if (t.raf) {
        cancelAnimationFrame(t.raf);
        t.raf = 0;
      }
      const amount = t.effective;
      t.raw = 0;
      t.effective = 0;
      if (!wasActive && amount === 0) return;
      if (trigger && amount > THRESHOLD && typeof callbackRef.current === "function") {
        refreshingRef.current = true;
        setRefreshing(true);
        // Hold the content at a fixed position while the spinner runs.
        setSliding(true);
        paint(HOLD_PULL);
        Promise.resolve()
          .then(() => callbackRef.current())
          .catch((err) => {
            console.error(`PullToRefresh/onRefresh: ${err && err.message ? err.message : err}`);
          })
          .finally(() => {
            refreshingRef.current = false;
            setRefreshing(false);
            setSliding(true);
            paint(0);
          });
      } else {
        // Below threshold — glide back to rest.
        setSliding(true);
        paint(0);
      }
    };

    const onTouchEnd = () => finish(true);
    const onTouchCancel = () => finish(false);

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchCancel);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
      if (t0.raf) {
        cancelAnimationFrame(t0.raf);
        t0.raf = 0;
      }
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ overscrollBehaviorY: "contain" }}
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 flex items-start justify-center overflow-hidden pointer-events-none"
        style={{ height: HOLD_PULL }}
      >
        <span
          ref={indicatorRef}
          className={`mt-3 inline-block w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{ opacity: 0 }}
        />
      </div>
      <div ref={contentRef}>{children}</div>
    </div>
  );
};

export default PullToRefresh;
