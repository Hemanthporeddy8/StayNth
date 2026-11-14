import { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  X,
  Lock,
  Layers,
  Flag,
  CalendarCheck,
  CheckCircle2,
  FileText,
  ToggleLeft,
  ToggleRight,
  Users,
  UserPlus,
  UserMinus,
  KeyRound,
  Smartphone,
  RefreshCw,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import {
  loadReplicaOrders,
  updateReplicaOrder,
  type ReplicaOrder,
  type PropertyRequest,
  type PropertyListing,
} from "@/lib/properties";
import { loadFeatureFlags, saveFeatureFlags, type FeatureFlags } from "@/lib/featureFlags";
import {
  getStoredToken,
  getStoredUser,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  type User,
} from "@/lib/auth";
import { generateTOTPSecret, getTOTPAuthUri, verifyTOTP } from "@/lib/totp";
import { cn } from "@/utils/cn";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export function AdminConsoleDialog({
  isOpen,
  onClose,
  requests,
  listings,
  onUpdateFlags,
}: {
  isOpen: boolean;
  onClose: () => void;
  requests: PropertyRequest[];
  listings: PropertyListing[];
  onUpdateFlags?: (flags: FeatureFlags) => void;
}) {
  // Session & Auth state
  const [authStep, setAuthStep] = useState<"login" | "totp" | "authenticated">("login");
  const [adminUser, setAdminUser] = useState<User | null>(null);

  // Email + Password form state
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Google Authenticator (TOTP) state
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState(false);
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Admin Console Active Tab
  const [activeTab, setActiveTab] = useState<"drafting" | "flags" | "bookings" | "team">("drafting");
  const [orders, setOrders] = useState<ReplicaOrder[]>(loadReplicaOrders);
  const [flags, setFlags] = useState<FeatureFlags>(loadFeatureFlags);
  const [selectedOrder, setSelectedOrder] = useState<ReplicaOrder | null>(null);
  const [viewingKycRequest, setViewingKycRequest] = useState<PropertyRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Team Management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [roleActionLoading, setRoleActionLoading] = useState(false);

  // TOTP Secret persistent per admin email
  const totpSecret = useMemo(() => {
    if (!adminUser?.email) return "";
    const key = `staynth.totp.secret.${adminUser.email.toLowerCase()}`;
    let saved = localStorage.getItem(key);
    if (!saved) {
      saved = generateTOTPSecret();
      localStorage.setItem(key, saved);
    }
    return saved;
  }, [adminUser?.email]);

  const totpUri = useMemo(() => {
    if (!adminUser?.email || !totpSecret) return "";
    return getTOTPAuthUri(adminUser.email, totpSecret, "StayNth");
  }, [adminUser?.email, totpSecret]);

  // On open: check current user and role
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    async function checkAuth() {
      setLoginLoading(true);
      const user = await fetchCurrentUser().catch(() => getStoredUser());
      if (cancelled) return;

      if (user) {
        // Verify admin/team role with server
        try {
          const token = getStoredToken();
          const res = await fetch("/api/admin/team", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
          });

          if (res.ok) {
            const data = await res.json();
            const role = data.currentUserRole || user.role;
            const updatedUser = { ...user, role };
            setAdminUser(updatedUser);

            // Check if 2FA was already verified in this session
            const session2fa = sessionStorage.getItem(`staynth.2fa.verified.${user.id}`);
            if (session2fa === "true") {
              setAuthStep("authenticated");
            } else {
              setAuthStep("totp");
            }
          } else {
            // Not founder or co_admin
            setAdminUser(user);
            setAuthStep("login");
          }
        } catch {
          setAdminUser(user);
          setAuthStep("login");
        }
      } else {
        setAuthStep("login");
      }
      setLoginLoading(false);
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Fetch team members when team tab is opened
  const fetchTeam = async () => {
    setTeamLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch("/api/admin/team", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.team || []);
        if (data.currentUserRole && adminUser) {
          setAdminUser((prev) => (prev ? { ...prev, role: data.currentUserRole } : null));
        }
      }
    } catch {
      // offline or local
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "team" && authStep === "authenticated") {
      fetchTeam();
    }
  }, [activeTab, authStep]);

  if (!isOpen) return null;

  // Handle standard Email + Password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const res = await loginUser(emailInput.trim(), passwordInput);
    if (!res.success || !res.user) {
      setLoginError(res.error || "Invalid email or password");
      setLoginLoading(false);
      return;
    }

    // Check with server if this account is Founder or Co-Admin
    try {
      const token = getStoredToken();
      const teamRes = await fetch("/api/admin/team", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!teamRes.ok) {
        setLoginError("Access Denied: Your account does not have Admin or Co-Admin privileges.");
        setLoginLoading(false);
        return;
      }

      const teamData = await teamRes.json();
      const effectiveRole = teamData.currentUserRole || res.user.role;
      const verifiedAdmin: User = { ...res.user, role: effectiveRole };
      setAdminUser(verifiedAdmin);

      // Check if 2FA session already exists
      const session2fa = sessionStorage.getItem(`staynth.2fa.verified.${verifiedAdmin.id}`);
      if (session2fa === "true") {
        setAuthStep("authenticated");
      } else {
        setAuthStep("totp");
      }
    } catch {
      setLoginError("Could not verify administrative credentials. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle TOTP Code Verification
  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecret) return;

    const isValid = await verifyTOTP(totpCode, totpSecret);
    if (isValid) {
      if (adminUser) {
        sessionStorage.setItem(`staynth.2fa.verified.${adminUser.id}`, "true");
      }
      setAuthStep("authenticated");
      setTotpError(false);
      showToast("Google Authenticator 2FA Verified");
    } else {
      setTotpError(true);
    }
  };

  // Emergency Backup Login: When user has no mobile phone
  const handleEmergencyBackupLogin = () => {
    if (!adminUser) return;
    sessionStorage.setItem(`staynth.2fa.verified.${adminUser.id}`, "emergency");
    setAuthStep("authenticated");
    showToast("Emergency backup session activated (Phone 2FA bypassed for this session)");
  };

  // Sign out / Lock console
  const handleSignOut = async () => {
    if (adminUser) {
      sessionStorage.removeItem(`staynth.2fa.verified.${adminUser.id}`);
    }
    await logoutUser();
    setAdminUser(null);
    setAuthStep("login");
    setEmailInput("");
    setPasswordInput("");
    setTotpCode("");
  };

  // Onboard new Co-Admin
  const handleOnboardCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = newAdminEmail.trim().toLowerCase();
    if (!target) return;

    setRoleActionLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch("/api/admin/team/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email: target, role: "co_admin" }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to onboard Co-Admin");
      } else {
        showToast(`Co-Admin access granted to ${target}!`);
        setNewAdminEmail("");
        await fetchTeam();
      }
    } catch {
      showToast("Network error while updating role");
    } finally {
      setRoleActionLoading(false);
    }
  };

  // 1-Click Revoke Co-Admin Access
  const handleRevokeCoAdmin = async (targetEmail: string) => {
    if (!confirm(`Are you sure you want to revoke Co-Admin access for ${targetEmail}?`)) return;

    setRoleActionLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch("/api/admin/team/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email: targetEmail, role: "user" }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to revoke access");
      } else {
        showToast(`Access revoked for ${targetEmail}`);
        await fetchTeam();
      }
    } catch {
      showToast("Network error while revoking role");
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, status: ReplicaOrder["status"]) => {
    const updated = updateReplicaOrder(orderId, { status });
    setOrders(updated);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
    showToast(`Order status updated to ${status}`);
  };

  const toggleFlag = (key: keyof FeatureFlags) => {
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    saveFeatureFlags(next);
    if (onUpdateFlags) onUpdateFlags(next);
    showToast(`${key} is now ${next[key] ? "ENABLED (LIVE)" : "DISABLED (HIDDEN)"}`);
  };

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const copySecretKey = () => {
    if (!totpSecret) return;
    navigator.clipboard.writeText(totpSecret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Metrics (Only Founder sees financial metrics)
  const isFounder = adminUser?.role === "founder";
  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalPlatformFees = requests.reduce((sum, r) => sum + (r.platformFee || 49), 0);

  return (
    <div className="animate-fade fixed inset-0 z-[95] flex items-center justify-center bg-ink/75 p-3 backdrop-blur-sm sm:p-5">
      <div className="animate-pop flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
              <ShieldCheck className="h-5 w-5 text-accent" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-[19px] text-ink">StayNth Admin Console</h2>
                {authStep === "authenticated" && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                      isFounder
                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                        : "bg-blue-100 text-blue-900 border border-blue-200"
                    )}
                  >
                    {isFounder ? "👑 Founder & Master Admin" : "🛠️ Co-Admin (Operations)"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-soft">
                {authStep === "authenticated"
                  ? isFounder
                    ? "Master control: Manage drafting orders, staff access, feature flags & platform revenue."
                    : "Operations control: Review blueprints, verify UTR payments & manage guest KYC."
                  : "Restricted administrative zone. Founder and Co-Admin authentication required."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink-faint hover:bg-paper-deep hover:text-ink"
            aria-label="Close Admin Console"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STEP 1: EMAIL & PASSWORD LOGIN SCREEN */}
        {authStep === "login" && (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-deep text-ink">
              <Lock className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mt-4 font-serif text-[21px] text-ink">Admin Sign In</h3>
            <p className="mt-1 max-w-sm text-[11px] text-ink-soft">
              Enter your StayNth Founder or Co-Admin account credentials.
            </p>

            <form onSubmit={handleEmailLogin} className="mt-5 w-full max-w-xs space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-medium text-ink-soft mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="founder@staynth.com"
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-[12.5px] text-ink outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-soft mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-[12.5px] text-ink outline-none focus:border-ink"
                />
              </div>

              {loginError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-[11px] text-red-700">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-xl bg-ink py-2.5 text-[12px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50"
              >
                {loginLoading ? "Verifying Credentials..." : "Continue to 2FA Verification →"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: GOOGLE AUTHENTICATOR (TOTP) + EMERGENCY BACKUP */}
        {authStep === "totp" && (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-accent">
              <Smartphone className="h-7 w-7" />
            </div>

            <h3 className="mt-3 font-serif text-[21px] text-ink">Google Authenticator</h3>
            <p className="mt-1 max-w-sm text-[11px] text-ink-soft">
              Enter the 6-digit rolling code generated on your mobile phone for{" "}
              <strong className="text-ink">{adminUser?.email}</strong>.
            </p>

            <form onSubmit={handleVerifyTotp} className="mt-5 w-full max-w-xs space-y-3">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => {
                    setTotpCode(e.target.value.replace(/\D/g, ""));
                    setTotpError(false);
                  }}
                  placeholder="000000"
                  className="h-13 w-full rounded-xl border-2 border-line bg-white px-3 text-center font-mono text-[24px] font-bold tracking-[0.4em] text-ink outline-none transition focus:border-accent"
                />
              </div>

              {totpError && (
                <p className="text-[11px] font-medium text-red-600">
                  Invalid 6-digit code. Check your phone time or try the new rolling code.
                </p>
              )}

              <button
                type="submit"
                disabled={totpCode.length !== 6}
                className="w-full rounded-xl bg-ink py-2.5 text-[12px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-40"
              >
                Verify & Unlock Console →
              </button>
            </form>

            {/* Emergency Fallback Button for users without mobile */}
            <div className="mt-4 w-full max-w-xs border-t border-line pt-3">
              <button
                type="button"
                onClick={handleEmergencyBackupLogin}
                className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/70 py-2 text-[11px] font-medium text-amber-900 transition hover:bg-amber-100"
              >
                📱 Don't have your phone with you?
                <br />
                <span className="font-semibold text-accent underline">
                  Continue with Verified Password (Emergency Backup)
                </span>
              </button>
            </div>

            {/* Google Authenticator Setup Guide Accordion */}
            <div className="mt-4 w-full max-w-md">
              <button
                type="button"
                onClick={() => setShowTotpSetup(!showTotpSetup)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-soft hover:text-ink"
              >
                <KeyRound className="h-3.5 w-3.5 text-accent" />
                {showTotpSetup ? "Hide Google Authenticator Key" : "Set up Google Authenticator on your phone"}
              </button>

              {showTotpSetup && (
                <div className="mt-3 rounded-xl border border-line bg-white p-3.5 text-left text-[11px] space-y-2">
                  <p className="font-semibold text-ink">How to add to Google Authenticator:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-ink-soft">
                    <li>Open <strong>Google Authenticator</strong> (or Apple Keychain / 1Password) on your phone.</li>
                    <li>Tap <strong>+</strong> and select <strong>Enter a setup key</strong>.</li>
                    <li>Account name: <code className="bg-paper px-1 rounded">StayNth Admin</code></li>
                    <li>
                      Your Secret Key:
                      <div className="mt-1 flex items-center justify-between rounded-lg bg-paper p-2 font-mono text-[11px] font-bold text-ink">
                        <span>{totpSecret}</span>
                        <button
                          type="button"
                          onClick={copySecretKey}
                          className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] text-ink-soft border border-line hover:text-ink"
                        >
                          {copiedKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          {copiedKey ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </li>
                  </ol>
                  {totpUri && (
                    <p className="text-[10px] text-ink-faint">
                      URI: <code className="break-all">{totpUri}</code>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: MAIN AUTHENTICATED CONSOLE */}
        {authStep === "authenticated" && (
          <>
            {/* Top Navigation Bar with Role-based Visibility */}
            <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-2">
              <div className="flex flex-wrap gap-1.5">
                {/* Tab 1: 3D Drafting Desk (Visible to Founder and Co-Admin) */}
                <button
                  onClick={() => setActiveTab("drafting")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                    activeTab === "drafting"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  )}
                >
                  <Layers className="h-3.5 w-3.5" /> 3D Drafting Desk ({orders.length})
                </button>

                {/* Tab 2: Bookings & KYC (Visible to Founder and Co-Admin) */}
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                    activeTab === "bookings"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  )}
                >
                  <CalendarCheck className="h-3.5 w-3.5" /> Bookings & KYC ({requests.length})
                </button>

                {/* Tab 3: Feature Flags (Founder ONLY) */}
                {isFounder && (
                  <button
                    onClick={() => setActiveTab("flags")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                      activeTab === "flags"
                        ? "bg-ink text-white"
                        : "text-ink-soft hover:bg-paper hover:text-ink"
                    )}
                  >
                    <Flag className="h-3.5 w-3.5 text-accent" /> Master Feature Flags
                  </button>
                )}

                {/* Tab 4: Team & Staff Access (Founder ONLY) */}
                {isFounder && (
                  <button
                    onClick={() => setActiveTab("team")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                      activeTab === "team"
                        ? "bg-ink text-white"
                        : "text-ink-soft hover:bg-paper hover:text-ink"
                    )}
                  >
                    <Users className="h-3.5 w-3.5 text-accent" /> Team & Staff Access
                  </button>
                )}
              </div>

              {/* Founder-only Metrics & Sign-out button */}
              <div className="flex items-center gap-3">
                {isFounder && (
                  <div className="hidden font-mono text-[10.5px] text-ink-faint md:block">
                    Listings: <strong className="text-ink">{listings.length}</strong> · Drafting:{" "}
                    <strong className="text-ink">₹{totalRevenue.toLocaleString()}</strong> · Fees:{" "}
                    <strong className="text-accent">₹{totalPlatformFees.toLocaleString()}</strong>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  title="Sign out & lock console"
                  className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-[10.5px] font-medium text-ink-soft hover:bg-paper-deep hover:text-ink"
                >
                  <LogOut className="h-3 w-3" /> Lock
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="scroll-warm min-h-0 flex-1 overflow-y-auto p-5">
              {/* TAB 1: 3D DRAFTING ORDERS */}
              {activeTab === "drafting" && (
                <div className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-serif text-[18px] text-ink">In-App 3D Drafting Desk</h3>
                      <p className="text-[11px] text-ink-soft">
                        Review customer blueprints, verify UPI UTR numbers, and deliver 3D digital twins.
                      </p>
                    </div>
                    <span className="rounded-lg border border-line bg-white px-2.5 py-1 text-[10.5px] font-mono text-ink-soft">
                      {orders.filter((o) => o.status === "pending").length} Pending ·{" "}
                      {orders.filter((o) => o.status === "in_progress").length} In Progress ·{" "}
                      {orders.filter((o) => o.status === "completed").length} Completed
                    </span>
                  </div>

                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-white py-14 text-center">
                      <Layers className="mx-auto h-8 w-8 text-ink-faint" />
                      <h4 className="mt-3 font-serif text-[18px] text-ink">No Drafting Orders Yet</h4>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        When property owners order the ₹299 Remote Replica or ₹999 On-Site visit, their orders appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-xl border border-line bg-white p-4 shadow-xs transition hover:border-ink/30"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase",
                                    order.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : order.status === "in_progress"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-amber-100 text-amber-800"
                                  )}
                                >
                                  {order.status.replace("_", " ")}
                                </span>
                                <span className="font-mono text-[9px] text-ink-faint">{order.id}</span>
                                <span className="rounded-md bg-paper-deep px-1.5 py-0.5 font-mono text-[9px] text-ink-soft">
                                  {order.tier === "remote_299" ? "Remote 3D Twin (₹299)" : "On-Site Visit (₹999)"}
                                </span>
                              </div>

                              <h4 className="mt-2 text-[14px] font-semibold text-ink">
                                {order.propertyName} · <span className="font-normal text-ink-soft">{order.city}</span>
                              </h4>

                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
                                <span>Contact: <strong>{order.contactName}</strong></span>
                                <span>Phone: <strong>{order.phone}</strong></span>
                                <span>
                                  Amount: <strong className="text-accent">₹{order.amount}</strong> (UTR:{" "}
                                  <code className="bg-paper px-1 rounded">{order.utrNumber}</code>)
                                </span>
                              </div>

                              {order.notes && (
                                <p className="mt-2 rounded-lg bg-paper p-2 text-[10.5px] text-ink-soft">
                                  <strong>Customer Notes:</strong> “{order.notes}”
                                </p>
                              )}

                              {/* Files attached */}
                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-mono text-ink-faint">
                                  Attached Drawings ({order.files?.length || 0}):
                                </span>
                                {order.files && order.files.length > 0 ? (
                                  order.files.map((file, idx) => (
                                    <span
                                      key={idx}
                                      className="flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-1 text-[10px] text-ink"
                                    >
                                      <FileText className="h-3 w-3 text-accent" /> {file.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-ink-faint italic">No files attached</span>
                                )}
                              </div>
                            </div>

                            {/* Status Update Actions */}
                            <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                              <span className="text-[9.5px] font-mono text-ink-faint">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex gap-1.5">
                                {order.status === "pending" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "in_progress")}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10.5px] font-semibold text-white hover:bg-blue-700"
                                  >
                                    Start Drafting
                                  </button>
                                )}
                                {order.status === "in_progress" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                    className="rounded-lg bg-green-600 px-3 py-1.5 text-[10.5px] font-semibold text-white hover:bg-green-700"
                                  >
                                    Mark Completed ✓
                                  </button>
                                )}
                                {order.status === "completed" && (
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-green-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> 3D Twin Delivered
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BOOKINGS & KYC */}
              {activeTab === "bookings" && (
                <div className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-serif text-[18px] text-ink">Guest Bookings & KYC Desk</h3>
                      <p className="text-[11px] text-ink-soft">
                        Review customer reservations and inspect Fast-Track Govt IDs for key clearance.
                      </p>
                    </div>
                    {isFounder && (
                      <span className="font-mono text-[11px] text-accent font-semibold">
                        Total Platform Revenue: ₹{totalPlatformFees.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {requests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-white py-14 text-center">
                      <CalendarCheck className="mx-auto h-8 w-8 text-ink-faint" />
                      <h4 className="mt-3 font-serif text-[18px] text-ink">No Bookings Yet</h4>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        When guests book stays, their records and attached KYC documents appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {requests.map((req) => (
                        <div
                          key={req.id}
                          className="rounded-xl border border-line bg-white p-3.5 shadow-xs text-[11px]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-ink">{req.id}</span>
                              <span className="text-ink-soft">{req.propertyTitle}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isFounder && (
                                <span className="font-mono text-accent font-bold">
                                  Platform Fee: ₹{req.platformFee || 49}{" "}
                                  {req.paymentUtr ? `(UTR: ${req.paymentUtr})` : ""}
                                </span>
                              )}
                              {req.fastTrackVerified && (
                                <button
                                  type="button"
                                  onClick={() => setViewingKycRequest(req)}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 hover:bg-emerald-200"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" /> View KYC ID
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft">
                            <span>Guest: <strong>{req.guestName}</strong> ({req.email})</span>
                            <span>Dates: <strong>{req.startDate} → {req.endDate || "N/A"}</strong></span>
                            <span>Tariff: <strong>₹{req.payAtHotel || req.total}</strong></span>
                            {req.message && (
                              <span className="w-full text-[10px] text-ink-faint italic mt-1">
                                Message: “{req.message}”
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MASTER FEATURE FLAGS (FOUNDER ONLY) */}
              {activeTab === "flags" && isFounder && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif text-[18px] text-ink">Master Feature Flags & Toggles</h3>
                    <p className="text-[11px] text-ink-soft">
                      Enable or disable customer-facing features in real-time. Changes apply instantly across the network.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Road Trip Planner Switch */}
                    <div className="rounded-xl border border-line bg-white p-4 transition hover:border-ink/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[13px] font-semibold text-ink">
                              Multi-Stop Road Trip Itinerary Planner
                            </h4>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase",
                                flags.roadTripPlanner
                                  ? "bg-green-100 text-green-800"
                                  : "bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {flags.roadTripPlanner ? "LIVE FOR ALL USERS" : "OFF / HIDDEN"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                            Controls the interactive multi-destination road trip simulator (Dandeli ➔ Murudeshwar ➔ Gokarna).
                            Toggle <strong>ON</strong> to reveal the planner button and route simulator to all marketplace visitors.
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFlag("roadTripPlanner")}
                          className="shrink-0 p-1 text-ink"
                          aria-label="Toggle Road Trip Planner"
                        >
                          {flags.roadTripPlanner ? (
                            <ToggleRight className="h-8 w-8 text-accent" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-ink-faint" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mobility Sponsors Switch */}
                    <div className="rounded-xl border border-line bg-white p-4 transition hover:border-ink/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[13px] font-semibold text-ink">
                              Local Mobility & Transport Sponsorships
                            </h4>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase",
                                flags.mobilitySponsors
                                  ? "bg-green-100 text-green-800"
                                  : "bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {flags.mobilitySponsors ? "LIVE" : "OFF"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                            Displays partner bike rentals, cabs, and self-drive cars on property detail pages.
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFlag("mobilitySponsors")}
                          className="shrink-0 p-1 text-ink"
                          aria-label="Toggle Mobility Sponsors"
                        >
                          {flags.mobilitySponsors ? (
                            <ToggleRight className="h-8 w-8 text-accent" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-ink-faint" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Fast-Track KYC Switch */}
                    <div className="rounded-xl border border-line bg-white p-4 transition hover:border-ink/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[13px] font-semibold text-ink">
                              ⚡ 10-Second Fast-Track Express Check-In KYC
                            </h4>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase",
                                flags.fastTrackKyc
                                  ? "bg-green-100 text-green-800"
                                  : "bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {flags.fastTrackKyc ? "LIVE" : "OFF"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                            Allows guests to upload Govt ID and face selfie during reservation for instant check-in.
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFlag("fastTrackKyc")}
                          className="shrink-0 p-1 text-ink"
                          aria-label="Toggle Fast-Track KYC"
                        >
                          {flags.fastTrackKyc ? (
                            <ToggleRight className="h-8 w-8 text-accent" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-ink-faint" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TEAM & STAFF ACCESS (FOUNDER ONLY) */}
              {activeTab === "team" && isFounder && (
                <div className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-serif text-[18px] text-ink">Team & Staff Access Control</h3>
                      <p className="text-[11px] text-ink-soft">
                        Onboard Co-Admins to help with 3D drafting and guest check-ins. Revoke access with 1 click anytime.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchTeam}
                      disabled={teamLoading}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] text-ink-soft hover:bg-paper"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", teamLoading && "animate-spin")} /> Refresh Staff
                    </button>
                  </div>

                  {/* Add Co-Admin Form */}
                  <div className="rounded-xl border border-line bg-white p-4">
                    <h4 className="text-[12.5px] font-semibold text-ink flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4 text-accent" /> Onboard New Co-Admin
                    </h4>
                    <p className="mt-0.5 text-[10.5px] text-ink-soft">
                      The user must have registered a StayNth account with their email. Once onboarded, they can access the 3D Drafting Desk and Guest KYC.
                    </p>

                    <form onSubmit={handleOnboardCoAdmin} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="co-admin@staynth.com"
                        className="h-9 flex-1 rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                      />
                      <button
                        type="submit"
                        disabled={roleActionLoading || !newAdminEmail.trim()}
                        className="rounded-lg bg-ink px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50"
                      >
                        {roleActionLoading ? "Processing..." : "Grant Co-Admin Access"}
                      </button>
                    </form>
                  </div>

                  {/* Staff List Table */}
                  <div className="overflow-hidden rounded-xl border border-line bg-white">
                    <div className="border-b border-line bg-paper px-4 py-2.5 text-[11px] font-semibold text-ink-soft grid grid-cols-12 gap-2">
                      <span className="col-span-4">Staff Member</span>
                      <span className="col-span-4">Email</span>
                      <span className="col-span-2">Role</span>
                      <span className="col-span-2 text-right">Actions</span>
                    </div>

                    <div className="divide-y divide-line text-[11.5px]">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-paper/50"
                        >
                          <div className="col-span-4 font-medium text-ink flex items-center gap-1.5">
                            {member.role === "founder" && <span title="Founder">👑</span>}
                            {member.role === "co_admin" && <span title="Co-Admin">🛠️</span>}
                            {member.name || "User"}
                          </div>
                          <div className="col-span-4 text-ink-soft font-mono text-[10.5px]">
                            {member.email}
                          </div>
                          <div className="col-span-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase",
                                member.role === "founder"
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : member.role === "co_admin"
                                  ? "bg-blue-100 text-blue-900 border border-blue-200"
                                  : "bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {member.role}
                            </span>
                          </div>
                          <div className="col-span-2 text-right">
                            {member.role === "co_admin" && (
                              <button
                                type="button"
                                onClick={() => handleRevokeCoAdmin(member.email)}
                                disabled={roleActionLoading}
                                className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-200 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                <UserMinus className="h-3 w-3" /> Revoke
                              </button>
                            )}
                            {member.role === "founder" && (
                              <span className="text-[10px] font-mono text-ink-faint">Master Founder</span>
                            )}
                            {member.role === "user" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setNewAdminEmail(member.email);
                                }}
                                className="text-[10px] text-accent hover:underline"
                              >
                                Promote
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-line bg-white px-5 py-3">
              <span className="text-[10px] text-ink-faint">
                StayNth Internal Console • Connected securely as {adminUser?.email}
              </span>
              <button
                onClick={onClose}
                className="rounded-lg bg-ink px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-ink/90"
              >
                Close Console
              </button>
            </div>
          </>
        )}
      </div>

      {/* Fast-Track KYC Inspector Modal inside Admin Console */}
      {viewingKycRequest && (
        <div className="animate-fade fixed inset-0 z-[105] flex items-center justify-center bg-ink/75 p-3 backdrop-blur-sm sm:p-5">
          <div className="animate-pop flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-serif text-[17px] leading-tight text-ink">Guest Govt ID & KYC Inspector</h3>
                  <p className="text-[10px] text-ink-soft">Verified reception clearance for {viewingKycRequest.guestName}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingKycRequest(null)}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scroll-warm min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-xl border border-line bg-white p-3 text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-faint">Guest Name</span>
                  <span className="font-semibold text-ink">{viewingKycRequest.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Email</span>
                  <span className="text-ink">{viewingKycRequest.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Dates</span>
                  <span className="font-mono text-ink">
                    {viewingKycRequest.startDate} → {viewingKycRequest.endDate || "N/A"}
                  </span>
                </div>
                {viewingKycRequest.paymentUtr && (
                  <div className="flex justify-between">
                    <span className="text-ink-faint">UPI UTR Ref</span>
                    <span className="font-mono font-medium text-ink">{viewingKycRequest.paymentUtr}</span>
                  </div>
                )}
              </div>

              {/* Govt Photo ID */}
              <div>
                <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                  1. Govt Photo ID (Aadhaar / Passport / Driving License)
                </label>
                {viewingKycRequest.idPhotoUrl ? (
                  viewingKycRequest.idPhotoUrl.startsWith("data:application/pdf") ? (
                    <div className="rounded-xl border border-line bg-white p-3 text-center">
                      <p className="text-[11px] text-ink-soft">Govt ID attached as PDF document</p>
                      <a
                        href={viewingKycRequest.idPhotoUrl}
                        download={`Govt-ID-${viewingKycRequest.guestName}.pdf`}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-[10.5px] font-medium text-white"
                      >
                        Download ID PDF
                      </a>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-line bg-white p-1">
                      <img
                        src={viewingKycRequest.idPhotoUrl}
                        alt="Govt ID Document"
                        className="max-h-60 w-full object-contain rounded-lg bg-paper"
                      />
                    </div>
                  )
                ) : (
                  <p className="text-[11px] text-ink-faint italic">No Govt ID attached</p>
                )}
              </div>

              {/* Live Selfie */}
              <div>
                <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                  2. Live Face Selfie
                </label>
                {viewingKycRequest.selfieUrl ? (
                  <div className="overflow-hidden rounded-xl border border-line bg-white p-1">
                    <img
                      src={viewingKycRequest.selfieUrl}
                      alt="Guest Live Selfie"
                      className="max-h-60 w-full object-contain rounded-lg bg-paper"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-faint italic">No live selfie attached</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-line bg-white px-5 py-3">
              <button
                type="button"
                onClick={() => setViewingKycRequest(null)}
                className="rounded-lg bg-ink px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-ink/90"
              >
                Close KYC Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {notice && (
        <div className="animate-toast fixed bottom-6 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-[11px] font-medium text-white shadow-xl">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> {notice}
        </div>
      )}
    </div>
  );
}
