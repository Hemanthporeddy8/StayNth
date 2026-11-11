import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Info, MousePointer2, Sparkles, X } from "lucide-react";
import type {
  DisplaySettings,
  FurnitureType,
  GenerateOptions,
  Plan,
  Room,
  Selection,
  Tool,
  ViewMode,
} from "@/types";
import {
  DEFAULT_OPTIONS,
  autoFurnish,
  computeWalls,
  formatFeet,
  generatePlan,
  getDefaultPlan,
  summarize,
  uid,
} from "@/lib/plan";
import { exportPlanFile, exportPng, exportSvg } from "@/lib/export";
import { peekBackupPlan, saveBackupPlan } from "@/lib/listingDraft";
import { Header } from "@/components/Header";
import { MobileToolStrip, ToolRail, TOOLS } from "@/components/ToolRail";
import { PlanCanvas } from "@/components/PlanCanvas";
import { Inspector } from "@/components/Inspector";
import { GenerateDialog, ShortcutsDialog } from "@/components/Dialogs";
import { RoomPhotoViewer } from "@/components/RoomPhotoViewer";
import { PropertiesApp } from "@/components/PropertiesApp";

const STORAGE_KEY = "draftline.plan.v1";

interface Persisted {
  plan: Plan;
  mode: ViewMode;
  display: DisplaySettings;
  options: GenerateOptions;
}

const DEFAULT_DISPLAY: DisplaySettings = { grid: true, dimensions: true, furniture: true, labels: true, photos: true };

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Persisted;
    if (!data?.plan?.rooms || !Array.isArray(data.plan.rooms)) return null;
    if (typeof data.plan.width !== "number" || typeof data.plan.depth !== "number") return null;
    return {
      plan: data.plan,
      mode: data.mode === "inside" ? "inside" : data.mode === "3d" ? "3d" : "plan",
      display: { ...DEFAULT_DISPLAY, ...(data.display ?? {}) },
      options: data.options ?? DEFAULT_OPTIONS,
    };
  } catch {
    return null;
  }
}

export default function App() {
  const persisted = useMemo(loadPersisted, []);
  const [section, setSection] = useState<"studio" | "properties">(() => typeof window !== "undefined" && window.location.hash.startsWith("#property=") ? "properties" : "studio");
  const [plan, setPlan] = useState<Plan>(() => persisted?.plan ?? getDefaultPlan());
  const [activeFloor, setActiveFloor] = useState(0);
  /** Set while Studio is open on behalf of the "List property" form. */
  const [listingReturn, setListingReturn] = useState<null | "edit" | "blank">(null);
  const [resumeListing, setResumeListing] = useState(false);
  const planRef = useRef(plan);
  planRef.current = plan;
  const [mode, setMode] = useState<ViewMode>(persisted?.mode ?? "plan");
  const [display, setDisplay] = useState<DisplaySettings>(persisted?.display ?? DEFAULT_DISPLAY);
  const [options, setOptions] = useState<GenerateOptions>(persisted?.options ?? DEFAULT_OPTIONS);
  const [history, setHistory] = useState<{ past: Plan[]; future: Plan[] }>({ past: [], future: [] });
  const [selection, setSelection] = useState<Selection>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [activeFurniture, setActiveFurniture] = useState<FurnitureType>("sofa");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [photoRoomId, setPhotoRoomId] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState("saved just now");
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const summary = useMemo(() => summarize(plan), [plan]);
  const floorNames = useMemo(() => plan.floorNames?.length ? plan.floorNames : ["Level 01"], [plan.floorNames]);
  const visiblePlan = useMemo(() => {
    const onFloor = (item: { floor?: number }) => (item.floor ?? 0) === activeFloor;
    return {
      ...plan,
      rooms: plan.rooms.filter(onFloor),
      extraWalls: plan.extraWalls.filter(onFloor),
      openings: plan.openings.filter(onFloor),
      furniture: plan.furniture.filter(onFloor),
    };
  }, [plan, activeFloor]);
  const visibleSummary = useMemo(() => summarize(visiblePlan), [visiblePlan]);
  const walls = useMemo(() => computeWalls(visiblePlan), [visiblePlan]);
  useEffect(() => {
    if (activeFloor >= floorNames.length) setActiveFloor(Math.max(0, floorNames.length - 1));
  }, [activeFloor, floorNames.length]);
  const studioFloorPlans = useMemo(() => floorNames.map((name, floor) => ({
    name,
    plan: {
      ...plan,
      rooms: plan.rooms.filter((item) => (item.floor ?? 0) === floor),
      extraWalls: plan.extraWalls.filter((item) => (item.floor ?? 0) === floor),
      openings: plan.openings.filter((item) => (item.floor ?? 0) === floor),
      furniture: plan.furniture.filter((item) => (item.floor ?? 0) === floor),
    },
  })), [plan, floorNames]);

  useEffect(() => {
    if (!persisted) {
      const t = window.setTimeout(
        () => showToast("Tip — click an eye icon to see real room photos"),
        900,
      );
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const commit = useCallback((next: Plan) => {
    setHistory((h) => ({ past: [...h.past.slice(-49), planRef.current], future: [] }));
    planRef.current = next;
    setPlan(next);
    setSavedLabel("saving…");
  }, []);

  const commitVisible = useCallback((next: Plan) => {
    const full = planRef.current;
    const otherFloor = (item: { floor?: number }) => (item.floor ?? 0) !== activeFloor;
    commit({
      ...full,
      rooms: [...full.rooms.filter(otherFloor), ...next.rooms.map((item) => ({ ...item, floor: activeFloor }))],
      extraWalls: [...full.extraWalls.filter(otherFloor), ...next.extraWalls.map((item) => ({ ...item, floor: activeFloor }))],
      openings: [...full.openings.filter(otherFloor), ...next.openings.map((item) => ({ ...item, floor: activeFloor }))],
      furniture: [...full.furniture.filter(otherFloor), ...next.furniture.map((item) => ({ ...item, floor: activeFloor }))],
    });
  }, [activeFloor, commit]);

  const undo = useCallback(() => {
    if (!history.past.length) return;
    const prev = history.past[history.past.length - 1];
    setHistory({ past: history.past.slice(0, -1), future: [planRef.current, ...history.future].slice(0, 49) });
    planRef.current = prev;
    setPlan(prev);
    setSelection(null);
    setSavedLabel("saving…");
  }, [history]);

  const redo = useCallback(() => {
    if (!history.future.length) return;
    const next = history.future[0];
    setHistory({ past: [...history.past.slice(-49), planRef.current], future: history.future.slice(1) });
    planRef.current = next;
    setPlan(next);
    setSelection(null);
    setSavedLabel("saving…");
  }, [history]);

  /* autosave */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const data: Persisted = { plan, mode, display, options };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSavedLabel("saved just now");
      } catch {
        setSavedLabel("storage full");
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [plan, mode, display, options]);

  const handleGenerate = (opts: GenerateOptions) => {
    const next = { ...generatePlan(opts, plan.name), floorNames: ["Level 01"] };
    commit(next);
    setActiveFloor(0);
    setOptions(opts);
    setGenerateOpen(false);
    setSelection(null);
    setTool("select");
    if (opts.furnished && !display.furniture) setDisplay({ ...display, furniture: true });
    setFitSignal((s) => s + 1);
    showToast(`Generated a ${opts.bedrooms === 1 ? "studio" : `${opts.bedrooms}-bed`} layout · ${Math.round(next.rooms.reduce((s, r) => s + r.w * r.h, 0))} sq ft`);
  };

  const handleBlank = () => {
    commit({ ...plan, floorNames: ["Level 01"], rooms: [], extraWalls: [], openings: [], furniture: [] });
    setActiveFloor(0);
    setSelection(null);
    setGenerateOpen(false);
    setTool("room");
    setFitSignal((s) => s + 1);
    showToast("Blank sheet ready — drag out your first room");
  };

  const handleAutoFurnish = () => {
    commitVisible({ ...visiblePlan, furniture: autoFurnish(visiblePlan.rooms) });
    showToast("Smart furnishing applied to every room on this floor");
  };

  const handleClearFurniture = () => {
    commitVisible({ ...visiblePlan, furniture: [] });
    showToast("Furniture cleared");
  };

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    const p = planRef.current;
    let next = p;
    if (selection.kind === "room") next = { ...p, rooms: p.rooms.filter((r) => r.id !== selection.id) };
    if (selection.kind === "furniture") next = { ...p, furniture: p.furniture.filter((f) => f.id !== selection.id) };
    if (selection.kind === "opening") next = { ...p, openings: p.openings.filter((o) => o.id !== selection.id) };
    if (selection.kind === "wall") next = { ...p, extraWalls: p.extraWalls.filter((w) => w.id !== selection.id) };
    commit(next);
    setSelection(null);
    showToast("Removed from the plan");
  }, [selection, commit, showToast]);

  const startListingPlan = (studioMode: "edit" | "blank") => {
    if (studioMode === "blank") {
      // Keep the current plan safe so Cancel can put it back.
      saveBackupPlan(planRef.current);
      commit({ ...planRef.current, floorNames: ["Level 01"], rooms: [], extraWalls: [], openings: [], furniture: [] });
      setTool("room");
    } else {
      saveBackupPlan(null);
      setTool("select");
    }
    setActiveFloor(0);
    setSelection(null);
    setMode("plan");
    setListingReturn(studioMode);
    setSection("studio");
    setFitSignal((signal) => signal + 1);
    showToast(studioMode === "blank" ? "Blank sheet ready — drag out your first room" : "Editing your plan for the listing");
  };

  const finishListingPlan = () => {
    if (!planRef.current.rooms.length) {
      showToast("Draw at least one room before returning to your listing");
      return;
    }
    saveBackupPlan(null);
    setListingReturn(null);
    setResumeListing(true);
    setSection("properties");
  };

  const cancelListingPlan = () => {
    const backup = peekBackupPlan();
    if (listingReturn === "blank" && backup) commit(backup);
    saveBackupPlan(null);
    setListingReturn(null);
    setResumeListing(true);
    setSection("properties");
  };

  const handleExport = async (format: "svg" | "png" | "json") => {
    try {
      if (format === "json") {
        exportPlanFile(plan);
        showToast("Plan file saved — upload it when listing a property");
        return;
      }
      if (format === "svg") exportSvg(visiblePlan, display.grid);
      else await exportPng(visiblePlan, display.grid);
      showToast(`Exported ${format.toUpperCase()} drawing with title block`);
    } catch {
      showToast("Export failed — please try again");
    }
  };

  const openGenerate = () => setGenerateOpen(true);

  const selectTool = useCallback((next: Tool) => {
    setTool(next);
    if (next !== "erase") setSelection(null);
    // The eye tool always reveals markers so they can be positioned or removed.
    if (next === "eye") setDisplay((current) => ({ ...current, photos: true }));
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSavedLabel("saved just now");
        showToast("Plan saved to this browser");
        return;
      }
      if (typing) return;
      if (generateOpen || helpOpen || photoRoomId || mode === "3d") return;

      if (e.key === "Escape") {
        setTool("select");
        setSelection(null);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection) {
          e.preventDefault();
          deleteSelection();
        }
        return;
      }
      const map: Record<string, Tool> = { v: "select", w: "wall", r: "room", d: "door", n: "window", f: "furniture", i: "eye", e: "erase", h: "pan" };
      const next = map[e.key.toLowerCase()];
      if (next && !e.metaKey && !e.ctrlKey) selectTool(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, generateOpen, helpOpen, photoRoomId, mode, selection, deleteSelection, showToast, selectTool]);

  const handleModeChange = (next: ViewMode) => {
    setMode(next);
    if (next === "inside" && !display.furniture) setDisplay({ ...display, furniture: true });
    showToast(
      next === "3d"
        ? "3D view · orbit the house or choose Walk to go inside"
        : next === "inside"
          ? "Inside preview · furnished top-down view"
          : "Blueprint view · measured plan",
    );
  };

  const changeFloor = (floor: number) => {
    setActiveFloor(Math.max(0, Math.min(floorNames.length - 1, floor)));
    setSelection(null);
    setFocusRequest(null);
    setFitSignal((signal) => signal + 1);
  };

  const addFloor = () => {
    const full = planRef.current;
    const floor = floorNames.length;
    const stairRoom = visiblePlan.rooms.find((room) => room.type === "hall") ?? visiblePlan.rooms[0];
    const stairs = (level: number) => stairRoom ? [{
      id: uid("f"), type: "stairs" as const, floor: level,
      x: stairRoom.x + Math.max(0.3, stairRoom.w - 3.7), y: stairRoom.y + Math.max(0.3, stairRoom.h - 6.4),
      w: 3.2, h: 6, rot: 0,
    }] : [];
    commit({
      ...full,
      floorNames: [...floorNames, `Level ${String(floor + 1).padStart(2, "0")}`],
      rooms: [...full.rooms, ...visiblePlan.rooms.map((room) => ({ ...room, id: uid("room"), floor }))],
      extraWalls: [...full.extraWalls, ...visiblePlan.extraWalls.map((wall) => ({ ...wall, id: uid("wall"), floor }))],
      openings: [...full.openings, ...visiblePlan.openings.map((opening) => ({ ...opening, id: uid("op"), floor }))],
      furniture: [...full.furniture, ...visiblePlan.furniture.map((item) => ({ ...item, id: uid("f"), floor })), ...stairs(activeFloor), ...stairs(floor)],
    });
    setActiveFloor(floor);
    setSelection(null);
    showToast(`Level ${floor + 1} added by duplicating this floor · stairs included`);
  };

  const deleteFloor = () => {
    if (floorNames.length <= 1) return;
    const full = planRef.current;
    const adjust = <T extends { floor?: number },>(items: T[]): T[] => items
      .filter((item) => (item.floor ?? 0) !== activeFloor)
      .map((item) => ({ ...item, floor: (item.floor ?? 0) > activeFloor ? (item.floor ?? 0) - 1 : (item.floor ?? 0) }));
    commit({
      ...full,
      floorNames: floorNames.filter((_, index) => index !== activeFloor),
      rooms: adjust(full.rooms), extraWalls: adjust(full.extraWalls), openings: adjust(full.openings), furniture: adjust(full.furniture),
    });
    setActiveFloor(Math.max(0, activeFloor - 1));
    setSelection(null);
    showToast("Floor removed");
  };

  const handleFocusRoom = (id: string) => {
    const room = visiblePlan.rooms.find((r) => r.id === id);
    if (!room) return;
    setMode("inside");
    if (!display.furniture) setDisplay({ ...display, furniture: true });
    setSelection({ kind: "room", id });
    setFocusRequest({ id, nonce: Date.now() });
    setInspectorOpen(false);
    showToast(`Inside ${room.name} — fit the sheet to return to the full plan`);
  };

  const handleViewPhotos = (id: string) => {
    setPhotoRoomId(id);
    setInspectorOpen(false);
  };

  const handleUpdateRoom = (roomId: string, patch: Partial<Room>) => {
    const current = planRef.current;
    commit({
      ...current,
      rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room)),
    });
  };

  const subtitle = `${summary.bedrooms} bed · ${summary.bathrooms} bath · ${Math.round(summary.area).toLocaleString()} ft²`;
  const toolLabel = TOOLS.find((t) => t.id === tool)?.label ?? "Select";

  if (section === "properties") {
    return (
      <PropertiesApp
        currentPlan={visiblePlan}
        floorPlans={studioFloorPlans}
        onBack={() => setSection("studio")}
        resumeListing={resumeListing}
        onResumed={() => setResumeListing(false)}
        onDrawInStudio={startListingPlan}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-paper-deep text-ink">
      <Header
        planName={plan.name}
        onNameChange={(name) => commit({ ...plan, name })}
        subtitle={subtitle}
        savedLabel={savedLabel}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onGenerate={openGenerate}
        onExport={handleExport}
        onOpenShortcuts={() => setHelpOpen(true)}
        onOpenInspector={() => setInspectorOpen(true)}
        onOpenProperties={() => setSection("properties")}
      />

      {listingReturn && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-accent/25 bg-accent-soft px-3 py-2 sm:px-4">
          <p className="min-w-0 text-[11.5px] leading-snug text-ink">
            <span className="font-semibold">{listingReturn === "blank" ? "Drawing a new plan for your listing." : "Editing the plan for your listing."}</span>{" "}
            <span className="text-ink-soft">Your listing details are saved — come back when the plan is ready.</span>
          </p>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={cancelListingPlan} className="rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper-deep">
              {listingReturn === "blank" ? "Cancel & restore my plan" : "Cancel"}
            </button>
            <button onClick={finishListingPlan} className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-medium text-white hover:bg-ink/90">
              <Check className="h-3.5 w-3.5" /> Done — back to listing
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <ToolRail
          tool={tool}
          onToolChange={selectTool}
          activeFurniture={activeFurniture}
          onFurnitureChange={(f) => {
            setActiveFurniture(f);
            setTool("furniture");
          }}
          onGenerate={openGenerate}
          onBlank={handleBlank}
          onOpenShortcuts={() => setHelpOpen(true)}
          savedLabel="saved"
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileToolStrip
            tool={tool}
            onToolChange={selectTool}
            onGenerate={openGenerate}
            activeFurniture={activeFurniture}
            onFurnitureChange={(f) => {
              setActiveFurniture(f);
              setTool("furniture");
            }}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onUndo={undo}
            onRedo={redo}
          />
          <main className="relative min-h-0 flex-1">
            <PlanCanvas
              plan={visiblePlan}
              mode={mode}
              onModeChange={handleModeChange}
              display={display}
              onDisplayChange={setDisplay}
              tool={tool}
              activeFurniture={activeFurniture}
              selection={selection}
              onSelect={setSelection}
              onChange={commitVisible}
              onToast={showToast}
              fitSignal={fitSignal}
              focusRequest={focusRequest}
              floorName={floorNames[activeFloor] ?? "Level 01"}
              floorIndex={activeFloor}
              floorCount={floorNames.length}
              onFloorChange={changeFloor}
              onAddFloor={addFloor}
              onDeleteFloor={deleteFloor}
              onViewPhotos={handleViewPhotos}
            />

            {/* floating generate pill for first-time discoverability */}
            <button
              onClick={openGenerate}
              className="group absolute left-1/2 top-4 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-medium text-ink-soft shadow-sm backdrop-blur transition hover:border-ink/30 hover:text-ink xl:flex"
            >
              <Sparkles className="h-3 w-3 text-accent transition group-hover:rotate-12" />
              Generate automatically
            </button>
          </main>
        </div>

        <aside className="hidden w-[338px] shrink-0 border-l border-line bg-white lg:block">
          <Inspector
            plan={visiblePlan}
            summary={visibleSummary}
            selection={selection}
            mode={mode}
            onSelect={setSelection}
            onChange={commitVisible}
            onGenerate={openGenerate}
            onAutoFurnish={handleAutoFurnish}
            onClearFurniture={handleClearFurniture}
            onFocusRoom={handleFocusRoom}
            onViewPhotos={handleViewPhotos}
          />
        </aside>
      </div>

      {/* status bar */}
      <footer className="flex h-[30px] shrink-0 items-center justify-between gap-3 border-t border-line bg-white px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
        <div className="flex items-center gap-2.5 truncate">
          <span className="flex items-center gap-1 text-ink-soft">
            <MousePointer2 className="h-2.5 w-2.5" /> {toolLabel}
          </span>
          <span className="hidden h-2.5 w-px bg-line sm:block" />
          <span className="hidden sm:inline">SNAP 6″</span>
          <span className="hidden h-2.5 w-px bg-line sm:block" />
          <span className="hidden md:inline">GRID 1′</span>
          <span className="hidden h-2.5 w-px bg-line md:block" />
          <span className="hidden md:inline">UNITS FT / IN</span>
          <span className="sm:hidden">{walls.length} walls</span>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <span>{Math.round(summary.area).toLocaleString()} SQ FT NET</span>
          <span className="h-2.5 w-px bg-line" />
          <span>{summary.bedrooms} BED · {summary.bathrooms} BATH</span>
          <span className="h-2.5 w-px bg-line" />
          <span>{Math.round(summary.wallLength)} LF WALLS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-moss">
            <Check className="h-2.5 w-2.5" /> {savedLabel}
          </span>
          <span className="hidden h-2.5 w-px bg-line sm:block" />
          <span className="hidden sm:inline">DRAFTLINE v1.0</span>
          <span className="text-ink-faint/60 lg:hidden">{formatFeet(plan.width)} × {formatFeet(plan.depth)}</span>
        </div>
      </footer>

      {/* mobile inspector drawer */}
      {inspectorOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[2px]"
            onClick={() => setInspectorOpen(false)}
            aria-label="Close panel"
          />
          <div className="animate-pop absolute right-0 top-0 h-full w-[min(93vw,368px)] border-l border-line bg-white shadow-2xl">
            <Inspector
              plan={visiblePlan}
              summary={visibleSummary}
              selection={selection}
              mode={mode}
              onSelect={(s) => {
                setSelection(s);
              }}
              onChange={commitVisible}
              onGenerate={() => {
                setInspectorOpen(false);
                openGenerate();
              }}
              onAutoFurnish={handleAutoFurnish}
              onClearFurniture={handleClearFurniture}
              onFocusRoom={handleFocusRoom}
              onViewPhotos={handleViewPhotos}
              onClose={() => setInspectorOpen(false)}
            />
          </div>
        </div>
      )}

      <GenerateDialog
        open={generateOpen}
        initial={options}
        onClose={() => setGenerateOpen(false)}
        onGenerate={handleGenerate}
        onBlank={handleBlank}
      />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <RoomPhotoViewer
        room={plan.rooms.find((r) => r.id === photoRoomId) ?? null}
        planName={plan.name}
        onClose={() => setPhotoRoomId(null)}
        onUpdateRoom={handleUpdateRoom}
        rooms={plan.rooms}
        onNavigate={setPhotoRoomId}
      />

      {/* toast */}
      {toast && (
        <div key={toast.id} className="pointer-events-none fixed bottom-11 left-1/2 z-50 w-max max-w-[92vw] -translate-x-1/2">
          <div className="animate-toast flex items-center gap-2 rounded-full border border-ink/10 bg-ink px-3.5 py-2 text-center text-[11.5px] font-medium text-white shadow-xl">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/15">
              <Check className="h-2.5 w-2.5" />
            </span>
            {toast.message}
            <button
              className="pointer-events-auto ml-1 rounded-full p-0.5 text-white/60 hover:text-white"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* tiny first-visit helper */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-11 right-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-soft shadow-sm transition hover:text-ink sm:hidden"
        aria-label="Help"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

    </div>
  );
}
