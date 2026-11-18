import { cn } from "@/utils/cn";

export function StayNthIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/staynth-icon.png"
      alt="StayNth Icon"
      className={cn("rounded-xl object-contain shadow-2xs", className)}
      loading="eager"
    />
  );
}

export function StayNthLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/staynth-icon.png"
        alt="StayNth Mark"
        className="h-8 w-8 rounded-xl object-contain shadow-xs"
        loading="eager"
      />
      <div className="flex flex-col leading-none">
        <div className="flex items-center">
          <span className="font-sans text-[17px] font-bold tracking-tight text-ink">stay</span>
          <span className="font-sans text-[17px] font-bold tracking-tight text-accent">Nth</span>
        </div>
        <span className="mt-0.5 font-mono text-[7.5px] uppercase tracking-[0.22em] text-ink-faint">
          studio · stays
        </span>
      </div>
    </div>
  );
}
