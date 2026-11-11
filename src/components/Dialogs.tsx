import { useEffect, useMemo, useState } from "react";
import { BedDouble, Bath, Ruler, Sparkles, X, Wand2, Sofa, Grid3X3, Check, Keyboard, Command, MousePointer2, FilePlus2 } from "lucide-react";
import type { GenerateOptions, Plan } from "@/types";
import {
  FOOTPRINT_PRESETS,
  ROOM_COLORS,
  clamp,
  computeWalls,
  generatePlan,
  summarize,
} from "@/lib/plan";
import { cn } from "@/utils/cn";

export function MiniPlan({ plan }: { plan: Plan }) {
  const walls = useMemo(() => computeWalls(plan), [plan]);
  const pad = 1.2;
  return (
    <svg viewBox={`${-pad} ${-pad} ${plan.width + pad * 2} ${plan.depth + pad * 2}`} className="h-full w-full">
      <defs>
        <pattern id="mini-grid" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M 2 0 L 0 0 0 2" fill="none" stroke="#e9e5da" strokeWidth="0.06" />
        </pattern>
      </defs>
      <rect x={-pad} y={-pad} width={plan.width + pad * 2} height={plan.depth + pad * 2} fill="#fbf9f4" />
      <rect x={-pad} y={-pad} width={plan.width + pad * 2} height={plan.depth + pad * 2} fill="url(#mini-grid)" />
      {plan.rooms.map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={ROOM_COLORS[r.type].fill} stroke="none" />
          {r.w > 5 && r.h > 4 && (
            <text
              x={r.x + r.w / 2}
              y={r.y + r.h / 2}
              textAnchor="middle"
              fontSize={Math.min(1.5, Math.min(r.w, r.h) * 0.14)}
              fill="#5d7279"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {r.name}
            </text>
          )}
        </g>
      ))}
      {walls.map((w) => (
        <line
          key={w.id}
          x1={w.x1}
          y1={w.y1}
          x2={w.x2}
          y2={w.y2}
          stroke="#25414d"
          strokeWidth={w.exterior ? 0.55 : 0.32}
          strokeLinecap="square"
        />
      ))}
      {plan.openings.map((o) => (
        <rect
          key={o.id}
          x={o.angle === 0 ? o.x - o.width / 2 : o.x - 0.35}
          y={o.angle === 0 ? o.y - 0.35 : o.y - o.width / 2}
          width={o.angle === 0 ? o.width : 0.7}
          height={o.angle === 0 ? 0.7 : o.width}
          fill="#fbf9f4"
        />
      ))}
    </svg>
  );
}

export function GenerateDialog({
  open,
  initial,
  onClose,
  onGenerate,
  onBlank,
}: {
  open: boolean;
  initial: GenerateOptions;
  onClose: () => void;
  onGenerate: (options: GenerateOptions) => void;
  onBlank: () => void;
}) {
  const [opts, setOpts] = useState<GenerateOptions>(initial);

  useEffect(() => {
    if (open) setOpts(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const preview = useMemo(() => generatePlan(opts, "Preview"), [opts]);
  const summary = useMemo(() => summarize(preview), [preview]);

  if (!open) return null;

  const setBedrooms = (bedrooms: 1 | 2 | 3 | 4) => {
    const preset = FOOTPRINT_PRESETS[bedrooms];
    setOpts((o) => ({
      ...o,
      bedrooms,
      width: preset.width,
      depth: preset.depth,
      bathrooms: bedrooms === 1 ? 1 : o.bathrooms,
    }));
  };

  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-3 backdrop-blur-[3px]">
      <div className="animate-pop flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-[24px] leading-tight text-ink">Generate a floor plan</h2>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                Set the brief — we'll lay out rooms, walls, doors and furniture. Then refine it by hand.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-deep hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto scroll-warm md:grid-cols-[1.05fr_1fr]">
          <div className="space-y-4 border-b border-line px-5 py-4 md:border-b-0 md:border-r">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="micro text-ink-faint">Bedrooms</span>
                <span className="font-mono text-[9px] uppercase tracking-wide text-ink-faint">{opts.bedrooms === 1 ? "studio + 1" : `${opts.bedrooms} bed`}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {([1, 2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setBedrooms(n)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border py-2 transition",
                      opts.bedrooms === n
                        ? "border-ink bg-ink text-white shadow-sm"
                        : "border-line bg-white text-ink-soft hover:border-ink/30 hover:bg-paper",
                    )}
                  >
                    <BedDouble className="h-4 w-4" strokeWidth={1.7} />
                    <span className="text-[12px] font-semibold leading-none">{n}</span>
                    <span className={cn("text-[8.5px] leading-none", opts.bedrooms === n ? "text-white/65" : "text-ink-faint")}>
                      {n === 1 ? "studio" : "bed"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="micro mb-1.5 block text-ink-faint">Bathrooms</span>
              <div className="grid grid-cols-2 gap-1.5">
                {([1, 2] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setOpts((o) => ({ ...o, bathrooms: n }))}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border py-2 text-[12px] font-medium transition",
                      opts.bathrooms === n
                        ? "border-ink bg-paper-deep text-ink"
                        : "border-line bg-white text-ink-soft hover:border-ink/30",
                    )}
                  >
                    <Bath className="h-3.5 w-3.5" /> {n} bath
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="micro flex items-center gap-1 text-ink-faint">
                  <Ruler className="h-3 w-3" /> Footprint
                </span>
                <span className="font-mono text-[9px] text-ink-soft">
                  {opts.width}′ × {opts.depth}′
                </span>
              </div>
              <div className="space-y-2 rounded-lg border border-line-soft bg-paper/50 p-2.5">
                <label className="flex items-center gap-3">
                  <span className="w-8 font-mono text-[9px] uppercase tracking-wide text-ink-faint">W</span>
                  <input
                    type="range"
                    min={22}
                    max={70}
                    step={1}
                    value={opts.width}
                    onChange={(e) => setOpts((o) => ({ ...o, width: Number(e.target.value) }))}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-ink"
                  />
                  <input
                    type="number"
                    value={opts.width}
                    min={22}
                    max={70}
                    onChange={(e) => setOpts((o) => ({ ...o, width: clamp(Number(e.target.value) || 22, 22, 70) }))}
                    className="h-7 w-11 rounded-md border border-line bg-white px-1.5 text-right font-mono text-[10px] text-ink outline-none focus:border-ink/40"
                  />
                </label>
                <label className="flex items-center gap-3">
                  <span className="w-8 font-mono text-[9px] uppercase tracking-wide text-ink-faint">D</span>
                  <input
                    type="range"
                    min={18}
                    max={60}
                    step={1}
                    value={opts.depth}
                    onChange={(e) => setOpts((o) => ({ ...o, depth: Number(e.target.value) }))}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-ink"
                  />
                  <input
                    type="number"
                    value={opts.depth}
                    min={18}
                    max={60}
                    onChange={(e) => setOpts((o) => ({ ...o, depth: clamp(Number(e.target.value) || 18, 18, 60) }))}
                    className="h-7 w-11 rounded-md border border-line bg-white px-1.5 text-right font-mono text-[10px] text-ink outline-none focus:border-ink/40"
                  />
                </label>
              </div>
              <div className="mt-1.5 flex gap-1">
                {Object.entries(FOOTPRINT_PRESETS).map(([n, p]) => (
                  <button
                    key={n}
                    onClick={() => setOpts((o) => ({ ...o, width: p.width, depth: p.depth }))}
                    className={cn(
                      "flex-1 rounded-md border py-1 font-mono text-[8.5px] uppercase tracking-wide transition",
                      opts.width === p.width && opts.depth === p.depth
                        ? "border-ink/30 bg-paper-deep text-ink"
                        : "border-transparent text-ink-faint hover:bg-paper",
                    )}
                  >
                    {p.width}×{p.depth}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setOpts((o) => ({ ...o, furnished: !o.furnished }))}
              className="flex w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5 text-left transition hover:border-ink/25"
            >
              <span className="flex items-center gap-2">
                <Sofa className="h-4 w-4 text-ink-soft" />
                <span>
                  <span className="block text-[12px] font-medium text-ink">Smart furnishing</span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-wide text-ink-faint">Beds · sofas · counters · plants</span>
                </span>
              </span>
              <span className={cn("relative h-5 w-9 rounded-full transition", opts.furnished ? "bg-ink" : "bg-line")}>
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                    opts.furnished ? "left-[18px]" : "left-0.5",
                  )}
                />
              </span>
            </button>
          </div>

          <div className="flex flex-col bg-paper/40 px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="micro flex items-center gap-1 text-ink-faint">
                <Grid3X3 className="h-3 w-3" /> Live preview
              </span>
              <span className="flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wide text-ink-soft">
                <Check className="h-2.5 w-2.5 text-moss" /> auto-fit
              </span>
            </div>
            <div className="relative flex min-h-[210px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-2 shadow-inner">
              <MiniPlan plan={preview} />
              <div className="absolute bottom-2 left-2 rounded-md border border-line bg-white/90 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-ink-faint backdrop-blur">
                {opts.width}′ × {opts.depth}′ · {Math.round(summary.area).toLocaleString()} sq ft
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              <div className="rounded-lg border border-line bg-white px-2 py-1.5 text-center">
                <p className="text-[13px] font-semibold leading-tight text-ink">{Math.round(summary.area).toLocaleString()}</p>
                <p className="font-mono text-[8px] uppercase tracking-wide text-ink-faint">sq ft net</p>
              </div>
              <div className="rounded-lg border border-line bg-white px-2 py-1.5 text-center">
                <p className="text-[13px] font-semibold leading-tight text-ink">{summary.rooms}</p>
                <p className="font-mono text-[8px] uppercase tracking-wide text-ink-faint">rooms</p>
              </div>
              <div className="rounded-lg border border-line bg-white px-2 py-1.5 text-center">
                <p className="text-[13px] font-semibold leading-tight text-ink">
                  {summary.bedrooms}·{summary.bathrooms}
                </p>
                <p className="font-mono text-[8px] uppercase tracking-wide text-ink-faint">bed · bath</p>
              </div>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-faint">
              <Wand2 className="mt-0.5 h-3 w-3 shrink-0" />
              Rule-based layout engine, not AI. Rooms, connected doors, exterior windows and furniture are placed locally in your browser — no model or API key needed.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-line bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={onBlank}
            className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-left text-[11px] font-medium text-ink-faint transition hover:text-ink sm:justify-start"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Start from a blank sheet
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-line bg-white px-4 py-2 text-[12px] font-medium text-ink-soft transition hover:bg-paper sm:flex-none">
              Cancel
            </button>
            <button
              onClick={() => onGenerate(opts)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-ink/90 sm:flex-none"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Generate layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SHORTCUT_GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Tools",
    items: [
      ["V", "Select & move"],
      ["W", "Draw wall"],
      ["R", "Draw room"],
      ["D", "Place door"],
      ["N", "Place window"],
      ["F", "Furnish"],
      ["I", "Place / remove eye"],
      ["E", "Erase"],
      ["H", "Pan sheet"],
    ],
  },
  {
    title: "Editing",
    items: [
      ["⌘ Z", "Undo"],
      ["⇧ ⌘ Z", "Redo"],
      ["⌫", "Delete selection"],
      ["Esc", "Cancel / deselect"],
      ["⇧ drag", "Free-angle wall"],
    ],
  },
  {
    title: "Canvas",
    items: [
      ["Scroll", "Zoom in / out"],
      ["Drag", "Pan when selection empty"],
      ["Wheel", "Zoom to cursor"],
      ["Fit", "Reset view button"],
      ["6″", "Snap grid"],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-3 backdrop-blur-[3px]">
      <div className="animate-pop w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper-deep text-ink-soft">
              <Keyboard className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold leading-none text-ink">Draw faster</h2>
              <p className="mt-1 text-[10.5px] text-ink-faint">Keyboard shortcuts & drawing tips</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scroll-warm px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="micro mb-2 text-ink-faint">{group.title}</p>
                <div className="space-y-1.5">
                  {group.items.map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ink-soft">{desc}</span>
                      <kbd className="shrink-0 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[9px] text-ink-soft shadow-[0_1px_0_#e6e1d5]">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-line-soft bg-paper/70 p-3">
            <MousePointer2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="text-[11px] leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">Tip:</span> draw walls with the Wall tool, then switch to Door and
              click directly on a wall. Use the Blueprint / Inside switch to preview the flat as a furnished interior.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-paper/50 px-5 py-2.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">Draftline studio · v1.0</span>
          <button onClick={onClose} className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-medium text-white hover:bg-ink/90">
            Got it <Command className="mb-0.5 ml-1 inline h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
