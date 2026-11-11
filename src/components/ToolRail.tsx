import { useEffect, useRef, useState } from "react";
import {
  Armchair,
  DoorOpen,
  Eraser,
  Hand,
  HelpCircle,
  MousePointer2,
  PenLine,
  Sparkles,
  SquareDashed,
  AppWindow,
  X,
  Check,
  Keyboard,
  FilePlus2,
  Undo2,
  Redo2,
  Eye,
} from "lucide-react";
import type { FurnitureType, Tool } from "@/types";
import { FURNITURE_META } from "@/lib/plan";
import { FurnitureSymbol } from "@/components/FurnitureSymbol";

export const TOOLS: { id: Tool; label: string; shortcut: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "wall", label: "Wall", shortcut: "W", icon: PenLine },
  { id: "room", label: "Room", shortcut: "R", icon: SquareDashed },
  { id: "door", label: "Door", shortcut: "D", icon: DoorOpen },
  { id: "window", label: "Window", shortcut: "N", icon: AppWindow },
  { id: "furniture", label: "Furnish", shortcut: "F", icon: Armchair },
  { id: "eye", label: "Eye", shortcut: "I", icon: Eye },
  { id: "erase", label: "Erase", shortcut: "E", icon: Eraser },
  { id: "pan", label: "Pan", shortcut: "H", icon: Hand },
];

const FEATURED: FurnitureType[] = [
  "bed",
  "sofa",
  "dining-table",
  "chair",
  "desk",
  "wardrobe",
  "balcony-chair",
  "rug",
  "plant",
  "counter",
  "toilet",
  "bathtub",
  "tv",
  "coffee-table",
  "bookshelf",
  "washer",
  "stairs",
];

export function ToolRail({
  tool,
  onToolChange,
  activeFurniture,
  onFurnitureChange,
  onGenerate,
  onBlank,
  onOpenShortcuts,
  savedLabel,
}: {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  activeFurniture: FurnitureType;
  onFurnitureChange: (f: FurnitureType) => void;
  onGenerate: () => void;
  onBlank: () => void;
  onOpenShortcuts: () => void;
  savedLabel: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tool !== "furniture") setPickerOpen(false);
  }, [tool]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items = FEATURED.filter((f) => f in FURNITURE_META);

  return (
    <div ref={wrapRef} className="relative z-20 hidden w-[70px] shrink-0 flex-col items-center border-r border-line bg-white py-3 sm:flex">
      <div className="no-scrollbar flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto">
      <div className="flex flex-col items-center gap-1">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                onToolChange(t.id);
                if (t.id === "furniture") setPickerOpen(true);
              }}
              title={`${t.label} (${t.shortcut})`}
              className={`group relative flex w-[54px] flex-col items-center gap-1 rounded-xl py-1.5 transition ${
                active ? "bg-paper-deep" : "hover:bg-paper"
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  active ? "bg-ink text-white shadow-sm" : "text-ink-soft group-hover:text-ink"
                }`}
              >
                <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
              </span>
              <span className={`text-[9px] font-medium leading-none ${active ? "text-ink" : "text-ink-faint group-hover:text-ink-soft"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-3 h-px w-8 bg-line" />

      <button
        onClick={onGenerate}
        className="group flex w-[54px] flex-col items-center gap-1 rounded-xl py-1.5 transition hover:bg-paper"
        title="Generate a layout automatically"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-accent/40 bg-accent-soft text-accent transition group-hover:border-accent">
          <Sparkles className="h-[16px] w-[16px]" />
        </span>
        <span className="text-[9px] font-medium text-ink-faint">Auto</span>
      </button>

      <button
        onClick={onBlank}
        className="group mt-1 flex w-[54px] flex-col items-center gap-1 rounded-xl py-1.5 transition hover:bg-paper"
        title="Start a blank sheet"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition group-hover:text-ink">
          <FilePlus2 className="h-[16px] w-[16px]" />
        </span>
        <span className="text-[9px] font-medium text-ink-faint">Blank</span>
      </button>
      </div>

      <div className="mt-2 flex shrink-0 flex-col items-center gap-2 pb-1">
        <button
          onClick={onOpenShortcuts}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition hover:bg-paper hover:text-ink"
          title="Shortcuts & help"
        >
          <HelpCircle className="h-[17px] w-[17px]" />
        </button>
        <div className="flex flex-col items-center rounded-lg border border-line-soft bg-paper px-1.5 py-1">
          <Check className="h-3 w-3 text-moss" />
          <span className="mt-0.5 font-mono text-[7px] uppercase tracking-wide text-ink-faint">{savedLabel}</span>
        </div>
      </div>

      {/* furniture flyout */}
      {pickerOpen && tool === "furniture" && (
        <div className="animate-pop absolute left-[64px] top-2 z-40 w-[292px] rounded-xl border border-line bg-white p-2.5 shadow-2xl">
          <div className="flex items-start justify-between px-1 pb-2">
            <div>
              <p className="text-[12px] font-semibold text-ink">Furniture library</p>
              <p className="text-[10px] text-ink-faint">Pick an object, then click the plan</p>
            </div>
            <button onClick={() => setPickerOpen(false)} className="rounded-md p-1 text-ink-faint hover:bg-paper-deep hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid max-h-[330px] grid-cols-4 gap-1.5 overflow-y-auto pr-0.5 scroll-warm">
            {items.map((type) => {
              const meta = FURNITURE_META[type];
              const selected = activeFurniture === type;
              return (
                <button
                  key={type}
                  onClick={() => onFurnitureChange(type)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
                    selected ? "border-accent bg-accent-soft" : "border-line-soft bg-white hover:border-line hover:bg-paper"
                  }`}
                >
                  <svg viewBox={`0 0 ${meta.w} ${meta.h}`} className="h-7 w-full" preserveAspectRatio="xMidYMid meet">
                    <FurnitureSymbol type={type} w={meta.w} h={meta.h} mode="inside" />
                  </svg>
                  <span className="w-full truncate text-center text-[8.5px] leading-tight text-ink-soft">{meta.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-paper px-2 py-1.5 font-mono text-[9px] text-ink-faint">
            <Keyboard className="h-3 w-3" /> Click to place · repeat to add more
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileToolStrip({
  tool,
  onToolChange,
  onGenerate,
  activeFurniture,
  onFurnitureChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  onGenerate: () => void;
  activeFurniture: FurnitureType;
  onFurnitureChange: (f: FurnitureType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-white px-2 py-1.5 no-scrollbar sm:hidden">
      <div className="mr-0.5 flex shrink-0 items-center gap-0.5 border-r border-line pr-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-lg p-1.5 text-ink-soft disabled:opacity-30"
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-lg p-1.5 text-ink-soft disabled:opacity-30"
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onToolChange(t.id)}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 ${
              active ? "bg-ink text-white" : "text-ink-soft"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[8.5px]">{t.label}</span>
          </button>
        );
      })}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {tool === "furniture" && (
          <select
            value={activeFurniture}
            onChange={(e) => onFurnitureChange(e.target.value as FurnitureType)}
            className="h-8 rounded-lg border border-line bg-paper px-1.5 text-[10px] text-ink outline-none"
            aria-label="Furniture to place"
          >
            {Object.entries(FURNITURE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        )}
        <button onClick={onGenerate} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1.5 text-[10px] font-medium text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Auto
        </button>
      </div>
    </div>
  );
}
