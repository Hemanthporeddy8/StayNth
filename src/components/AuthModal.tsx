import { useState } from "react";
import { Check, Lock, Mail, User as UserIcon, X, Loader2, Sparkles } from "lucide-react";
import { loginUser, registerUser, type User } from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: "signin" | "signup";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = "signin" }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters long");
          setLoading(false);
          return;
        }
        const res = await registerUser(name, email, password);
        if (!res.success || !res.user) {
          setError(res.error || "Failed to create account");
          setLoading(false);
          return;
        }
        onSuccess(res.user);
        onClose();
      } else {
        const res = await loginUser(email, password);
        if (!res.success || !res.user) {
          setError(res.error || "Invalid email or password");
          setLoading(false);
          return;
        }
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-white shadow-2xl transition-all">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-line bg-paper-deep px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                {mode === "signin" ? "Sign in to StayNth" : "Create StayNth Account"}
              </h2>
              <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                {mode === "signin" ? "Access your properties & plans" : "Cloud sync & owner dashboard"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-ink-faint transition hover:bg-line hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[11.5px] leading-relaxed text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-medium text-ink-soft">Full Name</label>
                <div className="relative mt-1">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-[12.5px] text-ink outline-none transition focus:border-ink/50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-ink-soft">Email Address</label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-[12.5px] text-ink outline-none transition focus:border-ink/50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-soft">Password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-[12.5px] text-ink outline-none transition focus:border-ink/50 focus:bg-white"
                />
              </div>
              {mode === "signup" && (
                <p className="mt-1 text-[10px] text-ink-faint">Minimum 6 characters</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink font-sans text-[12px] font-semibold text-white shadow-sm transition hover:bg-ink/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{mode === "signin" ? "Signing in..." : "Creating account..."}</span>
              </>
            ) : (
              <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
            )}
          </button>

          {/* Toggle between Sign In and Sign Up */}
          <div className="mt-5 border-t border-line-soft pt-4 text-center">
            {mode === "signin" ? (
              <p className="text-[11.5px] text-ink-soft">
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("signup");
                  }}
                  className="font-semibold text-accent hover:underline"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className="text-[11.5px] text-ink-soft">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("signin");
                  }}
                  className="font-semibold text-accent hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
