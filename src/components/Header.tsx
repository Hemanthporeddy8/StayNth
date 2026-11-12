import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileImage,
  FileCode2,
  Redo2,
  Sparkles,
  Undo2,
  Menu,
  PanelRight,
  Keyboard,
  Check,
  Cloud,
  Building2,
  LogIn,
  LogOut,
  Plus,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { AuthModal } from "@/components/AuthModal";
import { fetchCurrentUser, logoutUser, type User } from "@/lib/auth";

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#16313b" />
      <path d="M8 23V10.5C8 9.67 8.67 9 9.5 9H15" stroke="#f7f4ec" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 23H24V17" stroke="#f7f4ec" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M23 8.5v5.5" stroke="#d4653f" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19.5 9H23" stroke="#f7f4ec" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 16.5h9" stroke="#f7f4ec" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="15" cy="23" r="1.4" fill="#d4653f" />
    </svg>
  );
}

interface Props {
  planName: string;
  onNameChange: (name: string) => void;
  subtitle: string;
  savedLabel: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewPlan?: () => void;
  onGenerate: () => void;
  onExport: (format: "svg" | "png" | "json") => void;
  onOpenShortcuts: () => void;
  onOpenInspector: () => void;
  onOpenProperties: () => void;
}

export function Header({
  planName,
  onNameChange,
  subtitle,
  savedLabel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewPlan,
  onGenerate,
  onExport,
  onOpenShortcuts,
  onOpenInspector,
  onOpenProperties,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(planName);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser().then((u) => u && setCurrentUser(u));
  }, []);

  useEffect(() => setDraft(planName), [planName]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const commitName = () => {
    const next = draft.trim() || "Untitled plan";
    onNameChange(next);
    setDraft(next);
    setEditing(false);
  };

  return (
    <header className="relative z-30 flex h-[62px] shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">StayNth</span>
            <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-ink-faint">floor plan studio</span>
          </div>
        </div>

        <span className="hidden h-7 w-px bg-line sm:block" />

        <div className="flex min-w-0 flex-col">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setDraft(planName);
                  setEditing(false);
                }
              }}
              className="w-44 rounded border border-accent/50 bg-white px-1.5 py-0.5 text-[13px] font-semibold text-ink outline-none ring-2 ring-accent/10 sm:w-56"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="max-w-[180px] truncate rounded px-1 text-left text-[13px] font-semibold tracking-[-0.01em] text-ink transition hover:bg-paper-deep sm:max-w-[280px]"
              title="Rename plan"
            >
              {planName}
            </button>
          )}
          <div className="flex items-center gap-1.5 px-1">
            <span className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">{subtitle}</span>
            <span className="hidden items-center gap-1 text-[9px] text-moss sm:flex">
              <Cloud className="h-2.5 w-2.5" />
              {savedLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="hidden items-center gap-0.5 rounded-lg border border-line bg-white p-0.5 sm:flex">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className="rounded-md p-1.5 text-ink-soft transition hover:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
            className="rounded-md p-1.5 text-ink-soft transition hover:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={onOpenShortcuts}
          className="hidden rounded-lg border border-line bg-white p-2 text-ink-soft transition hover:bg-paper-deep md:block"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </button>

        <button
          onClick={onOpenProperties}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-[12px] font-medium text-ink-soft transition hover:bg-paper-deep hover:text-ink"
          title="Browse and list properties"
        >
          <Building2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Properties</span>
        </button>

        {onNewPlan && (
          <button
            onClick={onNewPlan}
            className="group flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-2 text-[12px] font-medium text-ink transition hover:border-ink/30 hover:bg-paper-deep sm:px-3"
            title="Start drawing a new house from scratch"
          >
            <Plus className="h-3.5 w-3.5 text-accent transition group-hover:scale-110" />
            <span className="hidden xs:inline sm:inline">New House</span>
            <span className="xs:hidden sm:hidden">New</span>
          </button>
        )}

        <button
          onClick={onGenerate}
          className="group flex items-center gap-1.5 rounded-lg border border-ink/15 bg-paper px-2.5 py-2 text-[12px] font-medium text-ink transition hover:border-ink/30 hover:bg-paper-deep sm:px-3"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent transition group-hover:rotate-12" />
          <span className="hidden xs:inline sm:inline">Auto-generate</span>
          <span className="xs:hidden sm:hidden">Generate</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setExportOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-ink/90 sm:px-3"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className={cn("h-3 w-3 opacity-70 transition", exportOpen && "rotate-180")} />
          </button>
          {exportOpen && (
            <div className="animate-pop absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-xl">
              <p className="micro px-2.5 py-1.5 text-ink-faint">Download drawing</p>
              <button
                onClick={() => {
                  onExport("svg");
                  setExportOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-paper-deep"
              >
                <FileCode2 className="mt-0.5 h-4 w-4 text-ink-soft" />
                <span>
                  <span className="block text-[12px] font-medium text-ink">Vector drawing · SVG</span>
                  <span className="block text-[10px] text-ink-faint">Editable, with title block & scale</span>
                </span>
              </button>
              <button
                onClick={() => {
                  onExport("png");
                  setExportOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-paper-deep"
              >
                <FileImage className="mt-0.5 h-4 w-4 text-ink-soft" />
                <span>
                  <span className="block text-[12px] font-medium text-ink">Image · PNG</span>
                  <span className="block text-[10px] text-ink-faint">High-res, ready to share</span>
                </span>
              </button>
              <button
                onClick={() => {
                  onExport("json");
                  setExportOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-paper-deep"
              >
                <Building2 className="mt-0.5 h-4 w-4 text-accent" />
                <span>
                  <span className="block text-[12px] font-medium text-ink">Plan file · JSON</span>
                  <span className="block text-[10px] text-ink-faint">All floors — upload it into a property listing</span>
                </span>
              </button>
              <div className="mt-1 flex items-center gap-1.5 border-t border-line-soft px-2.5 pb-0.5 pt-2 text-[10px] text-ink-faint">
                <Check className="h-3 w-3 text-moss" /> Adds scale bar, north arrow & sheet notes
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onOpenInspector}
          className="rounded-lg border border-line bg-white p-2 text-ink-soft transition hover:bg-paper-deep lg:hidden"
          title="Open plan panel"
          aria-label="Open plan panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>

        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink hover:bg-paper-deep transition shadow-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white uppercase">
                {currentUser.name.charAt(0)}
              </span>
              <span className="hidden sm:inline max-w-[80px] truncate">{currentUser.name}</span>
              <ChevronDown className="h-3 w-3 text-ink-faint" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl border border-line bg-white p-1.5 shadow-2xl z-50 animate-pop">
                <div className="px-3 py-2 border-b border-line-soft">
                  <p className="text-[12px] font-semibold text-ink truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-ink-soft truncate">{currentUser.email}</p>
                </div>
                <button
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await logoutUser();
                    setCurrentUser(null);
                  }}
                  className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-medium text-ink hover:bg-paper-deep transition shadow-sm"
          >
            <LogIn className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign In</span>
          </button>
        )}

        <button className="sr-only" aria-label="Open menu">
          <Menu />
        </button>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </header>
  );
}
