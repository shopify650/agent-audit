'use client';

import { Eye, Ghost, ScanEye } from 'lucide-react';
import type { BlindSpot } from '../lib/audit';

const spotStyles: Record<string, string> = {
  critical: 'border-[var(--error)] bg-[var(--error)]/15 text-[var(--error)]',
  warning: 'border-[var(--warning)] bg-[var(--warning)]/15 text-[var(--warning)]',
  optimization: 'border-[var(--optimization)] bg-[var(--optimization)]/15 text-[var(--optimization)]',
};

export default function XRayViewport({
  screenshot,
  width,
  height,
  blindSpots,
  xrayMode,
  selected,
  onToggle,
  onSelect,
}: {
  screenshot?: string;
  width: number;
  height: number;
  blindSpots: BlindSpot[];
  xrayMode: boolean;
  selected: number | null;
  onToggle: (xray: boolean) => void;
  onSelect: (index: number) => void;
}) {
  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] px-5 py-4">
        <div className="flex items-center gap-2">
          <ScanEye className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.75} aria-hidden="true" />
          <p className="text-sm font-medium text-[color:var(--ink)]">Agent X-Ray</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--hairline-strong)] bg-[var(--canvas-soft)] p-0.5">
          <button
            onClick={() => onToggle(false)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              !xrayMode ? 'bg-[var(--ink)] text-[color:var(--canvas)]' : 'text-[color:var(--body)] hover:text-[color:var(--ink)]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Normal View
          </button>
          <button
            onClick={() => onToggle(true)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              xrayMode ? 'bg-[var(--ink)] text-[color:var(--canvas)]' : 'text-[color:var(--body)] hover:text-[color:var(--ink)]'
            }`}
          >
            <ScanEye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Agent X-Ray
          </button>
        </div>
      </div>

      <div className="relative bg-[var(--canvas)]">
        {screenshot ? (
          <>
            <img
              src={screenshot}
              alt="Headless-agent view of the audited page"
              className="block w-full"
              style={{ filter: xrayMode ? 'grayscale(1) contrast(1.05) brightness(0.96)' : undefined }}
            />
            {xrayMode &&
              blindSpots.map((spot, index) => {
                const active = selected === index;
                return (
                  <button
                    key={spot.id}
                    onClick={() => onSelect(index)}
                    aria-label={`Blind spot ${index + 1}: ${spot.label}`}
                    title={spot.label}
                    className={`absolute rounded-sm border-2 shadow-[0_0_10px_rgba(0,0,0,0.25)] transition ${spotStyles[spot.severity]} ${
                      active ? 'z-20 ring-2 ring-[var(--primary)]' : 'z-10'
                    }`}
                    style={{
                      left: pct(spot.x, width),
                      top: pct(spot.y, height),
                      width: pct(spot.width, width),
                      height: pct(spot.height, height),
                      minWidth: 22,
                      minHeight: 22,
                    }}
                  >
                    <span className="absolute -top-3 left-0 rounded-full bg-current px-1.5 py-px text-[10px] font-bold text-[color:var(--on-primary)]">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <Ghost className="h-8 w-8 text-[var(--muted)]" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-3 text-sm text-[color:var(--body)]">No screenshot captured for this report.</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[color:var(--muted)]">
              The headless capture could not load this page. Blind spots below are still derived from the DOM snapshot.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
