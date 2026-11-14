import { useRef, useState } from "react";
import { Download, Upload, UserRound, X, ShieldCheck } from "lucide-react";

export interface WorkspaceProfile {
  name: string;
  email: string;
  role: "owner" | "guest" | "both";
}

export function WorkspaceDialog({
  profile,
  onSave,
  onExport,
  onImport,
  onClose,
  onOpenAdmin,
}: {
  profile: WorkspaceProfile;
  onSave: (profile: WorkspaceProfile) => void;
  onExport: () => void;
  onImport: (data: unknown) => void;
  onClose: () => void;
  onOpenAdmin?: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="animate-fade fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 p-3 backdrop-blur-sm">
      <div className="animate-pop w-full max-w-md rounded-2xl border border-line bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="flex items-center gap-2.5"><UserRound className="h-5 w-5 text-accent" /><div><h2 className="font-serif text-[23px] text-ink">Local workspace</h2><p className="text-[10px] text-ink-faint">Profile, backup and manual device transfer</p></div></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">No online account or server is connected. This profile and all marketplace data stay in this browser. Export a workspace file to move them to another device.</div>
          <div className="mt-4 space-y-3">
            <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase text-ink-faint">Display name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12px]" /></label>
            <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase text-ink-faint">Email</span><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12px]" /></label>
            <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase text-ink-faint">Workspace role</span><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as WorkspaceProfile["role"] })} className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12px]"><option value="both">Owner & guest</option><option value="owner">Property owner</option><option value="guest">Guest / buyer</option></select></label>
          </div>
          <button onClick={() => { onSave(draft); onClose(); }} className="mt-4 w-full rounded-lg bg-ink py-2 text-[11px] font-medium text-white">Save local profile</button>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
            <button onClick={onExport} className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2 text-[10.5px] text-ink-soft"><Download className="h-3.5 w-3.5" /> Export workspace</button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2 text-[10.5px] text-ink-soft"><Upload className="h-3.5 w-3.5" /> Import workspace</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try { onImport(JSON.parse(await file.text())); onClose(); } catch { onImport(null); onClose(); }
            }} />
          </div>

          {onOpenAdmin && (
            <div className="mt-3 border-t border-line pt-3">
              <button
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/5 py-2 text-[11px] font-semibold text-accent transition hover:bg-accent/10"
              >
                <ShieldCheck className="h-4 w-4" /> Open Master Admin Console
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
