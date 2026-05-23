"use client";

import { useEffect, useRef, useState } from "react";
import { getMetricInfo } from "@/lib/metricsGlossary";

const CLOSE_DELAY_MS = 120;

export default function MetricTooltip({
  metricKey,
  label,
}: {
  metricKey: string;
  label: string;
}) {
  const info = getMetricInfo(metricKey);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Outside-click / touch dismiss (mobile).
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent | TouchEvent) {
      if (!wrapperRef.current) return;
      const target = e.target as Node | null;
      if (target && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [open]);

  // Cleanup pending close timer on unmount.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // If we don't have a glossary entry, just render the bare label.
  if (!info) {
    return <>{label}</>;
  }

  function openNow() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex items-center gap-1"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <span>{label}</span>
      <button
        type="button"
        aria-label={`What is ${info.label}?`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={openNow}
        onBlur={scheduleClose}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-border-subtle text-text-dim hover:text-text-secondary hover:border-text-muted transition-colors leading-none"
        style={{ fontSize: 9 }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          className="absolute left-0 top-full mt-2 w-[280px] bg-bg-card border border-border rounded-lg p-3 z-50 shadow-xl"
          style={{ textTransform: "none", letterSpacing: 0 }}
        >
          <div className="text-text-primary text-[12px] font-mono font-semibold mb-1">
            {info.label}
          </div>
          <div className="text-text-secondary text-[11.5px] leading-relaxed">
            {info.definition}
          </div>
          {info.benchmark && (
            <div className="text-text-muted text-[11px] mt-1.5 italic leading-relaxed">
              {info.benchmark}
            </div>
          )}
        </span>
      )}
    </span>
  );
}
