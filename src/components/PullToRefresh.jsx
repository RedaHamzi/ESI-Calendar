/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 60;
const MAX_PULL = 100;

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
// no touch events fire and mouse scrolling is untouched. Must be paired
// with `overscroll-behavior` on the scroll container so the browser's
// native pull-to-refresh doesn't fight it.
const PullToRefresh = ({ onRefresh, children }) => {
  const wrapRef = useRef(null);
  const track = useRef({ active: false, startY: 0, pull: 0 });
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (refreshingRef.current || e.touches.length !== 1) {
        track.current.active = false;
        return;
      }
      const scroller = findScroller(el);
      if (scroller && scroller.scrollTop <= 0) {
        track.current = { active: true, startY: e.touches[0].clientY, pull: 0 };
      } else {
        track.current.active = false;
      }
    };

    const onTouchMove = (e) => {
      const t = track.current;
      if (!t.active || refreshingRef.current) return;
      const dy = e.touches[0].clientY - t.startY;
      if (dy <= 0) {
        t.pull = 0;
        setPull(0);
        return;
      }
      if (e.cancelable) e.preventDefault();
      t.pull = Math.min(dy * 0.5, MAX_PULL);
      setPull(t.pull);
    };

    const finish = (trigger) => {
      const t = track.current;
      t.active = false;
      const amount = t.pull;
      t.pull = 0;
      setPull(0);
      if (trigger && amount >= THRESHOLD && typeof callbackRef.current === "function") {
        refreshingRef.current = true;
        setRefreshing(true);
        Promise.resolve()
          .then(() => callbackRef.current())
          .catch(() => {})
          .finally(() => {
            refreshingRef.current = false;
            setRefreshing(false);
          });
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
    };
  }, []);

  const indicatorHeight = refreshing ? 48 : pull;
  const scale = refreshing ? 1 : Math.min(1, pull / THRESHOLD);

  return (
    <div ref={wrapRef}>
      <div
        aria-hidden="true"
        className="flex items-start justify-center overflow-hidden"
        style={{ height: indicatorHeight }}
      >
        {(pull > 0 || refreshing) && (
          <span
            className={`mt-3 inline-block w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 ${
              refreshing ? "animate-spin" : ""
            }`}
            style={{ transform: `scale(${scale})` }}
          />
        )}
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
