import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
import {
  ShieldCheck,
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
  Smartphone,
  RefreshCw,
  LogOut,
  ArrowLeft,
  QrCode,
  X,
  Compass,
  Plus,
  Trash2,
  Edit3,
  Play,
  Headphones,
  MessageSquare,
  Search,
  ExternalLink,
  Send,
} from "lucide-react";
import {
  loadReplicaOrders,
  updateReplicaOrder,
  loadRequests,
  loadListings,
  type ReplicaOrder,
  type PropertyRequest,
  type PropertyListing,
} from "@/lib/properties";
import { loadFeatureFlags, saveFeatureFlags, type FeatureFlags } from "@/lib/featureFlags";
import {
  loadLocalExpeditions,
  saveLocalExpeditions,
  saveRemoteExpedition,
  deleteRemoteExpedition,
  type Expedition,
  type ExpeditionDay,
} from "@/lib/expeditions";
import {
  fetchAdminThreads,
  fetchThreadMessages,
  sendSupportMessage,
  markThreadRead,
  type SupportThreadSummary,
  type SupportMessage,
} from "@/lib/support";
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
import { StayNthIcon } from "@/components/StayNthLogo";

function BrandMark() {
  return <StayNthIcon className="h-8 w-8 rounded-xl shadow-xs" />;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export function AdminPage({
  onExit,
  onOpenStudio,
}: {
  onExit: () => void;
  onOpenStudio?: () => void;
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

  // Admin Console Active Tab
  const [activeTab, setActiveTab] = useState<"drafting" | "flags" | "bookings" | "team" | "expeditions" | "support">("drafting");
  const [orders, setOrders] = useState<ReplicaOrder[]>(loadReplicaOrders);
  const [requests] = useState<PropertyRequest[]>(loadRequests);
  const [listings] = useState<PropertyListing[]>(loadListings);
  const [flags, setFlags] = useState<FeatureFlags>(loadFeatureFlags);
  const [selectedOrder, setSelectedOrder] = useState<ReplicaOrder | null>(null);
  const [viewingKycRequest, setViewingKycRequest] = useState<PropertyRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Live Support Desk state
  const [supportThreads, setSupportThreads] = useState<SupportThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<SupportMessage[]>([]);
  const [supportReplyInput, setSupportReplyInput] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportFilterQuery, setSupportFilterQuery] = useState("");
  const [supportPreviewModalUrl, setSupportPreviewModalUrl] = useState<string | null>(null);

  // Expeditions state
  const [expeditions, setExpeditions] = useState<Expedition[]>(loadLocalExpeditions);
  const [editingExpedition, setEditingExpedition] = useState<Expedition | null>(null);
  const [expeditionEditorOpen, setExpeditionEditorOpen] = useState(false);

  // Team Management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [roleActionLoading, setRoleActionLoading] = useState(false);

  // In-Person QR Code Pairing State (Founder Desk)
  const [pairingTarget, setPairingTarget] = useState<{ email: string; name: string } | null>(null);
  const [pairingQrUrl, setPairingQrUrl] = useState<string | null>(null);

  // Founder's personal TOTP secret
  const founderSecret = useMemo(() => {
    if (!adminUser?.email) return "";
    const key = `staynth.totp.secret.${adminUser.email.toLowerCase()}`;
    let saved = localStorage.getItem(key);
    if (!saved) {
      saved = generateTOTPSecret();
      localStorage.setItem(key, saved);
    }
    return saved;
  }, [adminUser?.email]);

  // Check current session on mount
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      setLoginLoading(true);
      const user = await fetchCurrentUser().catch(() => getStoredUser());
      if (cancelled) return;

      if (user) {
        try {
          const token = getStoredToken();
          const res = await fetch("/api/admin/team", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
          });

          if (res.ok) {
            const data = await res.json();
            const role = data.currentUserRole || user.role;
            const verified = { ...user, role };
            setAdminUser(verified);

            const session2fa = sessionStorage.getItem(`staynth.2fa.verified.${user.id}`);
            if (session2fa === "true" || session2fa === "emergency") {
              setAuthStep("authenticated");
            } else {
              setAuthStep("totp");
            }
          } else {
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
  }, []);

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

  // Support Desk handlers
  const refreshSupportThreads = async () => {
    if (authStep !== "authenticated") return;
    const threads = await fetchAdminThreads();
    setSupportThreads(threads);
  };

  const loadCurrentThread = async (id: string) => {
    setSupportLoading(true);
    const msgs = await fetchThreadMessages(id);
    setThreadMessages(msgs);
    setSupportLoading(false);
    await markThreadRead(id);
    setSupportThreads((prev) =>
      prev.map((t) => (t.threadId === id ? { ...t, unreadCount: 0 } : t))
    );
  };

  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
    loadCurrentThread(id);
  };

  const handleSendSupportReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedThreadId || !supportReplyInput.trim()) return;

    setSupportSending(true);
    const sent = await sendSupportMessage({
      threadId: selectedThreadId,
      message: supportReplyInput.trim(),
      senderName: adminUser ? adminUser.name : "StayNth Support Desk",
      senderRole: isFounder ? "founder" : "architect",
      email: adminUser?.email,
    });

    if (sent) {
      setThreadMessages((prev) => [...prev, sent]);
      setSupportReplyInput("");
      refreshSupportThreads();
    }
    setSupportSending(false);
  };

  useEffect(() => {
    if (authStep !== "authenticated") return;
    refreshSupportThreads();
    const interval = setInterval(() => {
      refreshSupportThreads();
      if (selectedThreadId) {
        fetchThreadMessages(selectedThreadId).then((msgs) => setThreadMessages(msgs));
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [authStep, selectedThreadId]);

  const totalUnreadSupport = useMemo(
    () => supportThreads.reduce((acc, t) => acc + (t.unreadCount || 0), 0),
    [supportThreads]
  );

  const selectedThread = useMemo(
    () => supportThreads.find((t) => t.threadId === selectedThreadId) || null,
    [supportThreads, selectedThreadId]
  );

  const filteredSupportThreads = useMemo(() => {
    const q = supportFilterQuery.trim().toLowerCase();
    if (!q) return supportThreads;
    return supportThreads.filter(
      (t) =>
        (t.lastSender && t.lastSender.toLowerCase().includes(q)) ||
        (t.propertyTitle && t.propertyTitle.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.lastMessage && t.lastMessage.toLowerCase().includes(q))
    );
  }, [supportThreads, supportFilterQuery]);

  // Email + Password login handler
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

      const session2fa = sessionStorage.getItem(`staynth.2fa.verified.${verifiedAdmin.id}`);
      if (session2fa === "true" || session2fa === "emergency") {
        setAuthStep("authenticated");
      } else {
        setAuthStep("totp");
      }
    } catch {
      setLoginError("Could not verify administrative privileges. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Google Authenticator TOTP verification
  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser?.email) return;

    const secretKey = `staynth.totp.secret.${adminUser.email.toLowerCase()}`;
    const secret = localStorage.getItem(secretKey) || founderSecret;
    if (!secret) return;

    const isValid = await verifyTOTP(totpCode, secret);
    if (isValid) {
      sessionStorage.setItem(`staynth.2fa.verified.${adminUser.id}`, "true");
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
    if (!confirm(`Revoke Co-Admin access for ${targetEmail}?`)) return;

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

  // Open In-Person QR Pairing for a Co-Admin or Founder
  const handleOpenPairing = async (targetEmail: string, targetName: string) => {
    const key = `staynth.totp.secret.${targetEmail.toLowerCase()}`;
    let secret = localStorage.getItem(key);
    if (!secret) {
      secret = generateTOTPSecret();
      localStorage.setItem(key, secret);
    }

    const uri = getTOTPAuthUri(targetEmail, secret, "StayNth");
    try {
      const qrDataUrl = await QRCode.toDataURL(uri, {
        width: 260,
        margin: 2,
        color: {
          dark: "#16313b",
          light: "#ffffff",
        },
      });
      setPairingTarget({ email: targetEmail, name: targetName });
      setPairingQrUrl(qrDataUrl);
    } catch {
      showToast("Failed to generate pairing QR code");
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
    showToast(`${key} is now ${next[key] ? "ENABLED (LIVE)" : "DISABLED (HIDDEN)"}`);
  };

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleTogglePublishExpedition = async (id: string) => {
    const updated = expeditions.map((e) => (e.id === id ? { ...e, published: !e.published } : e));
    setExpeditions(updated);
    saveLocalExpeditions(updated);
    const target = updated.find((e) => e.id === id);
    if (target) {
      const token = getStoredToken();
      await saveRemoteExpedition(target, token);
      showToast(`${target.title} is now ${target.published ? "LIVE" : "DRAFT (HIDDEN)"}`);
    }
  };

  const handleDeleteExpedition = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expedition?")) return;
    const token = getStoredToken();
    await deleteRemoteExpedition(id, token);
    const updated = expeditions.filter((e) => e.id !== id);
    setExpeditions(updated);
    saveLocalExpeditions(updated);
    showToast("Expedition deleted");
  };

  const handleSaveExpedition = async (saved: Expedition) => {
    const exists = expeditions.some((e) => e.id === saved.id);
    const updated = exists ? expeditions.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...expeditions];
    setExpeditions(updated);
    saveLocalExpeditions(updated);
    const token = getStoredToken();
    await saveRemoteExpedition(saved, token);
    setEditingExpedition(null);
    setExpeditionEditorOpen(false);
    showToast(`Saved expedition: ${saved.title}`);
  };

  const handleCreateNewExpedition = () => {
    const newExp: Expedition = {
      id: "exp_" + Date.now().toString(36),
      title: "New Curated Expedition",
      subtitle: "Scouted and verified by Founder",
      region: "Karnataka",
      season: "October to March",
      vehicleType: "Car / Bike",
      youtubeUrl: "",
      coverPhoto: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      published: true,
      createdAt: new Date().toISOString(),
      days: [
        {
          dayNumber: 1,
          fromLocation: "Start City",
          toLocation: "Destination Stop",
          distanceKm: 250,
          driveTime: "5 hrs",
          highlights: ["Scenic Viewpoint", "Local Food Pitstop"],
          founderTips: "Leave early to beat morning traffic. Scenic curves along the way.",
          stays: {
            backpacker: {
              name: "Local Camping / Hostel",
              type: "tent",
              pricePerNight: 699,
              photo: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=600&q=80",
              features: ["Clean Tents", "Campfire"],
            },
            comfort: {
              name: "Nature Resort Cottage",
              type: "resort",
              pricePerNight: 2600,
              photo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
              features: ["AC Cottage", "Breakfast Included"],
            },
            luxury: {
              name: "Private View Villa",
              type: "villa",
              pricePerNight: 8500,
              photo: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
              features: ["Private Deck", "Infinity Pool"],
            },
          },
        },
      ],
    };
    setEditingExpedition(newExp);
    setExpeditionEditorOpen(true);
  };

  const isFounder = adminUser?.role === "founder";
  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalPlatformFees = requests.reduce((sum, r) => sum + (r.platformFee || 49), 0);

  return (
    <div className="flex min-h-screen w-full flex-col bg-paper text-ink">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[18px] font-semibold text-ink sm:text-[20px]">
                StayNth Admin Portal
              </h1>
              {authStep === "authenticated" && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-mono text-[9.5px] font-bold uppercase",
                    isFounder
                      ? "border border-amber-200 bg-amber-100 text-amber-900"
                      : "border border-blue-200 bg-blue-100 text-blue-900"
                  )}
                >
                  {isFounder ? "👑 Founder & Master Admin" : "🛠️ Co-Admin (Operations)"}
                </span>
              )}
            </div>
            <p className="hidden text-[10.5px] text-ink-soft sm:block">
              {authStep === "authenticated"
                ? isFounder
                  ? "Master Founder Desk: Manage drafting, staff onboarding, feature flags & platform revenue"
                  : "Operations Desk: Review customer blueprints, verify UPI payments & manage guest KYC"
                : "Secure portal for authorized StayNth operations staff"}
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {authStep === "authenticated" && isFounder && (
            <button
              onClick={() => handleOpenPairing(adminUser.email, adminUser.name)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/15"
            >
              <QrCode className="h-3.5 w-3.5" /> Pair My Phone (QR)
            </button>
          )}

          {authStep === "authenticated" && (
            <button
              onClick={handleSignOut}
              title="Sign out & lock portal"
              className="flex items-center gap-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" /> Lock
            </button>
          )}

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-ink/90 shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Store
          </button>
        </div>
      </header>

      {/* FULL-PAGE LOGIN CARD (WHEN NOT AUTHENTICATED) */}
      {authStep === "login" && (
        <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-deep text-ink">
              <Lock className="h-7 w-7 text-accent" />
            </div>

            <div className="mt-4 text-center">
              <h2 className="font-serif text-[22px] font-bold text-ink">Admin Sign In</h2>
              <p className="mt-1 text-[11.5px] text-ink-soft">
                Sign in with your StayNth Founder or Co-Admin account.
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11.5px] font-medium text-ink-soft mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="founder@staynth.com"
                  className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[13px] text-ink outline-none transition focus:border-ink focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-medium text-ink-soft mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[13px] text-ink outline-none transition focus:border-ink focus:bg-white"
                />
              </div>

              {loginError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11.5px] text-red-700">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-xl bg-ink py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50 shadow-sm"
              >
                {loginLoading ? "Verifying Credentials..." : "Continue to 2FA Verification →"}
              </button>
            </form>
          </div>
        </main>
      )}

      {/* FULL-PAGE GOOGLE AUTHENTICATOR (TOTP) STEP */}
      {authStep === "totp" && (
        <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl sm:p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-accent">
              <Smartphone className="h-7 w-7" />
            </div>

            <h2 className="mt-4 font-serif text-[22px] font-bold text-ink">Google Authenticator</h2>
            <p className="mt-1 text-[11.5px] text-ink-soft">
              Enter the 6-digit rolling code generated on your mobile phone for{" "}
              <strong className="text-ink">{adminUser?.email}</strong>.
            </p>

            <form onSubmit={handleVerifyTotp} className="mt-6 space-y-4">
              <div>
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
                  className="h-14 w-full rounded-xl border-2 border-line bg-paper px-3 text-center font-mono text-[26px] font-bold tracking-[0.4em] text-ink outline-none transition focus:border-accent focus:bg-white"
                />
              </div>

              {totpError && (
                <p className="text-[11.5px] font-medium text-red-600">
                  Invalid 6-digit code. Check your phone's clock or wait for the next rolling code.
                </p>
              )}

              <button
                type="submit"
                disabled={totpCode.length !== 6}
                className="w-full rounded-xl bg-ink py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-40 shadow-sm"
              >
                Verify & Unlock Dashboard →
              </button>
            </form>

            {/* Emergency Fallback Button for users without mobile */}
            <div className="mt-5 border-t border-line pt-4">
              <button
                type="button"
                onClick={handleEmergencyBackupLogin}
                className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3 text-center text-[11.5px] text-amber-900 transition hover:bg-amber-100"
              >
                📱 Don't have your phone right now?
                <br />
                <span className="font-semibold text-accent underline">
                  Continue with Verified Password (Emergency Backup)
                </span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* FULL-PAGE AUTHENTICATED DASHBOARD */}
      {authStep === "authenticated" && (
        <div className="flex flex-1 flex-col">
          {/* Navigation Sub-header / Tabs */}
          <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-4 py-2 sm:px-6">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTab("drafting")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                  activeTab === "drafting"
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                )}
              >
                <Layers className="h-3.5 w-3.5" /> 3D Drafting Desk ({orders.length})
              </button>

              <button
                onClick={() => setActiveTab("bookings")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                  activeTab === "bookings"
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                )}
              >
                <CalendarCheck className="h-3.5 w-3.5" /> Bookings & KYC ({requests.length})
              </button>

              {isFounder && (
                <button
                  onClick={() => setActiveTab("flags")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                    activeTab === "flags"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  )}
                >
                  <Flag className="h-3.5 w-3.5 text-accent" /> Master Feature Flags
                </button>
              )}

              {isFounder && (
                <button
                  onClick={() => setActiveTab("team")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                    activeTab === "team"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  )}
                >
                  <Users className="h-3.5 w-3.5 text-accent" /> Team & Staff Access
                </button>
              )}

              {isFounder && (
                <button
                  onClick={() => setActiveTab("expeditions")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                    activeTab === "expeditions"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  )}
                >
                  <Compass className="h-3.5 w-3.5 text-accent" /> Founder Expeditions ({expeditions.length})
                </button>
              )}

              <button
                onClick={() => setActiveTab("support")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                  activeTab === "support"
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                )}
              >
                <Headphones className="h-3.5 w-3.5 text-accent" /> Live Support Desk ({supportThreads.length})
                {totalUnreadSupport > 0 && (
                  <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.2 font-mono text-[9px] font-bold text-ink animate-pulse">
                    {totalUnreadSupport}
                  </span>
                )}
              </button>
            </div>

            {/* Founder Metrics Bar */}
            {isFounder && (
              <div className="hidden font-mono text-[11px] text-ink-faint lg:block">
                Listings: <strong className="text-ink">{listings.length}</strong> · Drafting:{" "}
                <strong className="text-ink">₹{totalRevenue.toLocaleString()}</strong> · Platform Fees:{" "}
                <strong className="text-accent">₹{totalPlatformFees.toLocaleString()}</strong>
              </div>
            )}
          </div>

          {/* Main Workspace Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {/* TAB 1: 3D DRAFTING ORDERS */}
            {activeTab === "drafting" && (
              <div className="space-y-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-serif text-[20px] font-bold text-ink">In-App 3D Drafting Desk</h2>
                    <p className="text-[11.5px] text-ink-soft">
                      Review customer blueprints, verify UPI UTR numbers, and complete 3D digital twin orders.
                    </p>
                  </div>
                  <span className="rounded-lg border border-line bg-white px-3 py-1 text-[11px] font-mono text-ink-soft">
                    {orders.filter((o) => o.status === "pending").length} Pending ·{" "}
                    {orders.filter((o) => o.status === "in_progress").length} In Progress ·{" "}
                    {orders.filter((o) => o.status === "completed").length} Completed
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-xs">
                    <Layers className="mx-auto h-8 w-8 text-ink-faint" />
                    <h3 className="mt-3 font-serif text-[18px] text-ink">No Drafting Orders Yet</h3>
                    <p className="mt-1 text-[11.5px] text-ink-soft">
                      When property owners order the ₹299 Remote Replica or ₹999 On-Site visit, their orders appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3.5">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-line bg-white p-5 shadow-xs transition hover:border-ink/30"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
                                  order.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : order.status === "in_progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                )}
                              >
                                {order.status.replace("_", " ")}
                              </span>
                              <span className="font-mono text-[9.5px] text-ink-faint">{order.id}</span>
                              <span className="rounded-md bg-paper-deep px-1.5 py-0.5 font-mono text-[9.5px] text-ink-soft">
                                {order.tier === "remote_299" ? "Remote 3D Twin (₹299)" : "On-Site Visit (₹999)"}
                              </span>
                            </div>

                            <h3 className="mt-2 text-[15px] font-semibold text-ink">
                              {order.propertyName} · <span className="font-normal text-ink-soft">{order.city}</span>
                            </h3>

                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-soft">
                              <span>Contact: <strong>{order.contactName}</strong></span>
                              <span>Phone: <strong>{order.phone}</strong></span>
                              <span>
                                Amount: <strong className="text-accent">₹{order.amount}</strong> (UTR:{" "}
                                <code className="bg-paper px-1 rounded">{order.utrNumber}</code>)
                              </span>
                            </div>

                            {order.notes && (
                              <p className="mt-2 rounded-lg bg-paper p-2.5 text-[11px] text-ink-soft">
                                <strong>Customer Notes:</strong> “{order.notes}”
                              </p>
                            )}

                            {/* Files attached */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="text-[10.5px] font-mono text-ink-faint">
                                Attached Drawings ({order.files?.length || 0}):
                              </span>
                              {order.files && order.files.length > 0 ? (
                                order.files.map((file, idx) => (
                                  <span
                                    key={idx}
                                    className="flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-1 text-[10.5px] text-ink"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-accent" /> {file.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10.5px] text-ink-faint italic">No files attached</span>
                              )}
                            </div>
                          </div>

                          {/* Status Actions */}
                          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                            <span className="text-[10px] font-mono text-ink-faint">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                              {order.status === "pending" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "in_progress")}
                                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 shadow-xs"
                                >
                                  Start Drafting
                                </button>
                              )}
                              {order.status === "in_progress" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                  className="rounded-lg bg-green-600 px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-green-700 shadow-xs"
                                >
                                  Mark Completed ✓
                                </button>
                              )}
                              {order.status === "completed" && (
                                <span className="flex items-center gap-1 text-[11.5px] font-medium text-green-700">
                                  <CheckCircle2 className="h-4 w-4" /> 3D Twin Delivered
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
                    <h2 className="font-serif text-[20px] font-bold text-ink">Guest Bookings & KYC Desk</h2>
                    <p className="text-[11.5px] text-ink-soft">
                      Review customer reservations and inspect Fast-Track Govt IDs for reception key clearance.
                    </p>
                  </div>
                  {isFounder && (
                    <span className="font-mono text-[11.5px] text-accent font-semibold">
                      Total Platform Revenue: ₹{totalPlatformFees.toLocaleString()}
                    </span>
                  )}
                </div>

                {requests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-xs">
                    <CalendarCheck className="mx-auto h-8 w-8 text-ink-faint" />
                    <h3 className="mt-3 font-serif text-[18px] text-ink">No Bookings Yet</h3>
                    <p className="mt-1 text-[11.5px] text-ink-soft">
                      When guests book stays, their records and attached KYC documents appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-xl border border-line bg-white p-4 shadow-xs text-[11.5px]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-ink">{req.id}</span>
                            <span className="text-ink-soft font-medium">{req.propertyTitle}</span>
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
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-200"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Inspect KYC ID
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-ink-soft">
                          <span>Guest: <strong>{req.guestName}</strong> ({req.email})</span>
                          <span>Dates: <strong>{req.startDate} → {req.endDate || "N/A"}</strong></span>
                          <span>Tariff: <strong>₹{req.payAtHotel || req.total}</strong></span>
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
                  <h2 className="font-serif text-[20px] font-bold text-ink">Master Feature Flags & Toggles</h2>
                  <p className="text-[11.5px] text-ink-soft">
                    Enable or disable customer-facing features in real-time. Changes apply instantly across the network.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {/* Road Trip Planner Switch */}
                  <div className="rounded-xl border border-line bg-white p-5 shadow-xs transition hover:border-ink/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-ink">
                            Multi-Stop Road Trip Itinerary Planner
                          </h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
                              flags.roadTripPlanner
                                ? "bg-green-100 text-green-800"
                                : "bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {flags.roadTripPlanner ? "LIVE FOR ALL USERS" : "OFF / HIDDEN"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
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
                          <ToggleRight className="h-9 w-9 text-accent" />
                        ) : (
                          <ToggleLeft className="h-9 w-9 text-ink-faint" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mobility Sponsors Switch */}
                  <div className="rounded-xl border border-line bg-white p-5 shadow-xs transition hover:border-ink/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-ink">
                            Local Mobility & Transport Sponsorships
                          </h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
                              flags.mobilitySponsors
                                ? "bg-green-100 text-green-800"
                                : "bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {flags.mobilitySponsors ? "LIVE" : "OFF"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                          Displays partner bike rentals, cabs, and self-drive cars on property detail pages.
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFlag("mobilitySponsors")}
                        className="shrink-0 p-1 text-ink"
                        aria-label="Toggle Mobility Sponsors"
                      >
                        {flags.mobilitySponsors ? (
                          <ToggleRight className="h-9 w-9 text-accent" />
                        ) : (
                          <ToggleLeft className="h-9 w-9 text-ink-faint" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Fast-Track KYC Switch */}
                  <div className="rounded-xl border border-line bg-white p-5 shadow-xs transition hover:border-ink/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-ink">
                            ⚡ 10-Second Fast-Track Express Check-In KYC
                          </h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
                              flags.fastTrackKyc
                                ? "bg-green-100 text-green-800"
                                : "bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {flags.fastTrackKyc ? "LIVE" : "OFF"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                          Allows guests to upload Govt ID and face selfie during reservation for instant check-in.
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFlag("fastTrackKyc")}
                        className="shrink-0 p-1 text-ink"
                        aria-label="Toggle Fast-Track KYC"
                      >
                        {flags.fastTrackKyc ? (
                          <ToggleRight className="h-9 w-9 text-accent" />
                        ) : (
                          <ToggleLeft className="h-9 w-9 text-ink-faint" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Founder Expeditions Switch */}
                  <div className="rounded-xl border border-line bg-white p-5 shadow-xs transition hover:border-ink/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-ink">
                            Founder-Curated Expeditions & 3-Tier Trails
                          </h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
                              flags.founderExpeditions
                                ? "bg-green-100 text-green-800"
                                : "bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {flags.founderExpeditions ? "LIVE FOR ALL USERS" : "OFF / HIDDEN"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                          Displays your curated road trip circuits (with Backpacker, Comfort & Luxury options and YouTube vlog integration) on the marketplace.
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFlag("founderExpeditions")}
                        className="shrink-0 p-1 text-ink"
                        aria-label="Toggle Founder Expeditions"
                      >
                        {flags.founderExpeditions ? (
                          <ToggleRight className="h-9 w-9 text-accent" />
                        ) : (
                          <ToggleLeft className="h-9 w-9 text-ink-faint" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TEAM & STAFF ACCESS (FOUNDER ONLY) */}
            {activeTab === "team" && isFounder && (
              <div className="space-y-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-serif text-[20px] font-bold text-ink">Team & Staff Access Control</h2>
                    <p className="text-[11.5px] text-ink-soft">
                      Onboard Co-Admins. Co-Admins must physically come to your desk to scan their Google Authenticator QR code.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchTeam}
                    disabled={teamLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[11.5px] text-ink-soft hover:bg-paper"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", teamLoading && "animate-spin")} /> Refresh Staff
                  </button>
                </div>

                {/* Onboard Co-Admin Form */}
                <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                  <h3 className="text-[13.5px] font-semibold text-ink flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-accent" /> Onboard New Co-Admin
                  </h3>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    Ask the staff member to sign up on StayNth first. Enter their registered email below to grant Co-Admin access.
                  </p>

                  <form onSubmit={handleOnboardCoAdmin} className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="co-admin@staynth.com"
                      className="h-10 flex-1 rounded-xl border border-line bg-paper px-3.5 text-[12.5px] text-ink outline-none focus:border-ink focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={roleActionLoading || !newAdminEmail.trim()}
                      className="rounded-xl bg-ink px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50 shadow-xs"
                    >
                      {roleActionLoading ? "Processing..." : "Grant Co-Admin Access"}
                    </button>
                  </form>
                </div>

                {/* Staff List Table */}
                <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
                  <div className="border-b border-line bg-paper px-5 py-3 text-[11.5px] font-semibold text-ink-soft grid grid-cols-12 gap-2">
                    <span className="col-span-4">Staff Member</span>
                    <span className="col-span-3">Email</span>
                    <span className="col-span-2">Role</span>
                    <span className="col-span-3 text-right">Actions</span>
                  </div>

                  <div className="divide-y divide-line text-[12px]">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="grid grid-cols-12 items-center gap-2 px-5 py-3.5 hover:bg-paper/40"
                      >
                        <div className="col-span-4 font-medium text-ink flex items-center gap-1.5">
                          {member.role === "founder" && <span title="Founder">👑</span>}
                          {member.role === "co_admin" && <span title="Co-Admin">🛠️</span>}
                          {member.name || "User"}
                        </div>
                        <div className="col-span-3 text-ink-soft font-mono text-[11px]">
                          {member.email}
                        </div>
                        <div className="col-span-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase",
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
                        <div className="col-span-3 flex items-center justify-end gap-2">
                          {/* Co-Admin In-Person 2FA Pairing Button */}
                          {member.role === "co_admin" && (
                            <button
                              type="button"
                              onClick={() => handleOpenPairing(member.email, member.name)}
                              className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1 text-[10.5px] font-medium text-ink hover:bg-paper-deep"
                              title="Co-admin must come to your desk to scan"
                            >
                              <QrCode className="h-3 w-3 text-accent" /> In-Person 2FA QR
                            </button>
                          )}

                          {member.role === "co_admin" && (
                            <button
                              type="button"
                              onClick={() => handleRevokeCoAdmin(member.email)}
                              disabled={roleActionLoading}
                              className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-[10.5px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <UserMinus className="h-3 w-3" /> Revoke
                            </button>
                          )}

                          {member.role === "founder" && (
                            <button
                              type="button"
                              onClick={() => handleOpenPairing(member.email, member.name)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-accent hover:underline"
                            >
                              <QrCode className="h-3 w-3" /> My 2FA QR
                            </button>
                          )}

                          {member.role === "user" && (
                            <button
                              type="button"
                              onClick={() => setNewAdminEmail(member.email)}
                              className="text-[11px] text-accent font-medium hover:underline"
                            >
                              Promote to Co-Admin
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: FOUNDER EXPEDITIONS STUDIO */}
            {activeTab === "expeditions" && isFounder && (
              <div className="space-y-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-serif text-[20px] font-bold text-ink">Founder Expeditions Studio</h2>
                    <p className="text-[11.5px] text-ink-soft">
                      Curate multi-stop travel circuits with 3 budget tiers (Backpacker, Comfort, Luxury) and link your YouTube scouting vlogs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewExpedition}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-ink/90 transition shadow-xs"
                  >
                    <Plus className="h-4 w-4" /> Create New Expedition
                  </button>
                </div>

                {expeditions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-xs">
                    <Compass className="mx-auto h-8 w-8 text-ink-faint" />
                    <h3 className="mt-3 font-serif text-[18px] text-ink">No Expeditions Created Yet</h3>
                    <p className="mt-1 text-[11.5px] text-ink-soft">
                      Create your first scouting circuit to feature on the marketplace.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {expeditions.map((exp) => (
                      <div
                        key={exp.id}
                        className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs transition hover:border-ink/30 flex flex-col justify-between"
                      >
                        <div className="relative h-44 w-full bg-ink">
                          <img
                            src={exp.coverPhoto}
                            alt={exp.title}
                            className="h-full w-full object-cover opacity-80"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4 text-white">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                {exp.days.length} Days
                              </span>
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9.5px] text-white">
                                {exp.region}
                              </span>
                            </div>
                            <h3 className="mt-1 text-[15px] font-bold leading-snug line-clamp-1">
                              {exp.title}
                            </h3>
                          </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <p className="text-[11.5px] text-ink-soft line-clamp-2">
                            {exp.subtitle}
                          </p>

                          <div className="flex flex-wrap gap-2 text-[10.5px] text-ink-faint font-mono">
                            <span>Season: {exp.season}</span>
                            <span>•</span>
                            <span>Vehicle: {exp.vehicleType}</span>
                          </div>

                          <div className="border-t border-line pt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTogglePublishExpedition(exp.id)}
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                                  exp.published
                                    ? "bg-green-100 text-green-800"
                                    : "bg-neutral-100 text-neutral-600"
                                )}
                              >
                                {exp.published ? "● LIVE" : "○ DRAFT"}
                              </button>
                              {exp.youtubeUrl && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium">
                                  <Play className="h-3 w-3 fill-red-600" /> Vlog Linked
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpedition(exp);
                                  setExpeditionEditorOpen(true);
                                }}
                                className="rounded-lg border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-paper-deep"
                              >
                                <Edit3 className="h-3.5 w-3.5 inline mr-1" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpedition(exp.id)}
                                className="rounded-lg bg-red-50 p-1.5 text-red-700 hover:bg-red-100 border border-red-200"
                                title="Delete expedition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: LIVE SUPPORT & CONCIERGE DESK */}
            {activeTab === "support" && (
              <div className="space-y-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-[20px] font-bold text-ink">
                        Live Customer & Concierge Desk
                      </h2>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[9.5px] font-bold text-amber-900 border border-amber-200">
                        100% In-App · Realtime
                      </span>
                    </div>
                    <p className="text-[11.5px] text-ink-soft">
                      Direct host & guest chats, paper sketch blueprint uploads, and 3D drafting concierge requests.
                    </p>
                  </div>
                  <button
                    onClick={refreshSupportThreads}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-ink hover:bg-paper-deep"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Threads
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 rounded-2xl border border-line bg-white shadow-xs overflow-hidden h-[640px]">
                  {/* Left Column: Threads List */}
                  <div className="flex flex-col border-r border-line bg-paper/25">
                    {/* Filter Input */}
                    <div className="p-3 border-b border-line bg-white">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-faint" />
                        <input
                          type="text"
                          value={supportFilterQuery}
                          onChange={(e) => setSupportFilterQuery(e.target.value)}
                          placeholder="Search hosts, listings, emails…"
                          className="h-8 w-full rounded-lg border border-line bg-paper pl-8 pr-2 text-[11px] outline-none focus:border-ink"
                        />
                      </div>
                    </div>

                    {/* Threads Scroll */}
                    <div className="flex-1 overflow-y-auto divide-y divide-line/60">
                      {filteredSupportThreads.length === 0 ? (
                        <div className="p-6 text-center text-ink-faint text-[11.5px]">
                          No conversation threads found.
                        </div>
                      ) : (
                        filteredSupportThreads.map((t) => {
                          const isSelected = t.threadId === selectedThreadId;
                          return (
                            <button
                              key={t.threadId}
                              type="button"
                              onClick={() => handleSelectThread(t.threadId)}
                              className={cn(
                                "w-full p-3.5 text-left transition flex flex-col gap-1 hover:bg-paper",
                                isSelected ? "bg-amber-50/70 border-l-3 border-accent" : "bg-white"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-ink text-[12px] truncate max-w-[190px]">
                                  {t.lastSender || "Guest / Host"}
                                </span>
                                <span className="font-mono text-[9px] text-ink-faint">
                                  {new Date(t.lastActivity).toLocaleDateString([], { month: "short", day: "numeric" })}
                                </span>
                              </div>

                              {t.propertyTitle && (
                                <span className="inline-block rounded bg-amber-100/70 px-1.5 py-0.5 font-mono text-[9px] font-medium text-amber-900 truncate max-w-[240px]">
                                  🏡 {t.propertyTitle}
                                </span>
                              )}

                              <p className="text-[11px] text-ink-soft line-clamp-1">
                                {t.lastMessage || "(Attachment uploaded)"}
                              </p>

                              <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-ink-faint">
                                <span>{t.messageCount} messages</span>
                                {t.unreadCount > 0 && (
                                  <span className="rounded-full bg-accent px-1.5 py-0.2 font-bold text-white">
                                    {t.unreadCount} unread
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Chat Transcript & Reply Desk */}
                  <div className="flex flex-col h-full bg-paper/10">
                    {selectedThreadId ? (
                      <>
                        {/* Conversation Header */}
                        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-ink text-[13px]">
                                {selectedThread?.lastSender || "Host / Guest"}
                              </h3>
                              {selectedThread?.email && (
                                <span className="text-[11px] text-ink-soft">
                                  ({selectedThread.email})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] text-ink-faint">
                              <span className="font-mono">Thread: {selectedThreadId}</span>
                              {selectedThread?.propertyTitle && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-accent">
                                    Property: {selectedThread.propertyTitle}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {selectedThread?.propertyTitle && (
                            <button
                              onClick={() => {
                                localStorage.setItem(
                                  "staynth_active_ticket_draft",
                                  JSON.stringify({
                                    ticketId: selectedThread.threadId,
                                    propertyTitle: selectedThread.propertyTitle,
                                    sketchUrl: threadMessages.find((m) => m.attachmentUrl)?.attachmentUrl || null,
                                    hostName: selectedThread.lastSender,
                                    returnUrl: "#admin",
                                  })
                                );
                                if (onOpenStudio) {
                                  onOpenStudio();
                                } else {
                                  window.history.replaceState(null, "", "/");
                                  window.location.hash = "";
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10.5px] font-semibold text-amber-950 hover:bg-amber-100 shadow-2xs transition"
                              title="Open Real Studio to draft 3D plan with PiP reference sketch"
                            >
                              <ExternalLink className="h-3 w-3 text-accent" /> Draft in Real Studio
                            </button>
                          )}
                        </div>

                        {/* Transcript Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                          {supportLoading ? (
                            <div className="flex h-full items-center justify-center text-[12px] text-ink-faint">
                              Loading conversation messages…
                            </div>
                          ) : (
                            threadMessages.map((msg) => {
                              const isStaff =
                                msg.senderRole === "architect" ||
                                msg.senderRole === "founder" ||
                                msg.senderRole === "admin";

                              return (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex flex-col max-w-[80%]",
                                    isStaff ? "ml-auto items-end" : "mr-auto items-start"
                                  )}
                                >
                                  <div className="mb-0.5 flex items-center gap-1.5 text-[9.5px] text-ink-faint">
                                    <span className="font-semibold text-ink">
                                      {isStaff
                                        ? msg.senderRole === "founder"
                                          ? "👑 Founder Desk"
                                          : "🏛️ StayNth Architect Team"
                                        : msg.senderName || "Host"}
                                    </span>
                                    <span>·</span>
                                    <span className="font-mono">
                                      {new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>

                                  <div
                                    className={cn(
                                      "rounded-2xl px-4 py-2.5 text-[12px] leading-relaxed shadow-2xs",
                                      isStaff
                                        ? "rounded-tr-xs bg-ink text-white"
                                        : "rounded-tl-xs border border-line bg-white text-ink"
                                    )}
                                  >
                                    <p className="whitespace-pre-wrap">{msg.message}</p>

                                    {/* Attachment / Floor plan sketch preview */}
                                    {msg.attachmentUrl && (
                                      <div className="mt-2 overflow-hidden rounded-xl border border-line bg-black/5 p-1">
                                        <img
                                          src={msg.attachmentUrl}
                                          alt="Uploaded sketch"
                                          className="max-h-60 rounded-lg object-contain cursor-pointer hover:opacity-90"
                                          onClick={() => setSupportPreviewModalUrl(msg.attachmentUrl || null)}
                                        />
                                        <div className="mt-1 flex items-center justify-between px-1 text-[10px]">
                                          <span className="font-mono text-ink-faint">Paper sketch / Plan</span>
                                          <button
                                            type="button"
                                            onClick={() => setSupportPreviewModalUrl(msg.attachmentUrl || null)}
                                            className="font-medium text-accent hover:underline"
                                          >
                                            View Full Screen (Zoom)
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Reply Box */}
                        <form
                          onSubmit={handleSendSupportReply}
                          className="flex items-center gap-2 border-t border-line bg-white p-3"
                        >
                          <input
                            type="text"
                            value={supportReplyInput}
                            onChange={(e) => setSupportReplyInput(e.target.value)}
                            placeholder={`Reply as ${isFounder ? "Founder Desk" : "StayNth Architect"}…`}
                            className="h-10 flex-1 rounded-xl border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink focus:bg-white"
                          />
                          <button
                            type="submit"
                            disabled={supportSending || !supportReplyInput.trim()}
                            className="flex h-10 items-center gap-1.5 rounded-xl bg-ink px-4 text-[11.5px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-40"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {supportSending ? "Sending…" : "Reply"}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-ink-soft">
                        <Headphones className="h-12 w-12 text-ink-faint/60 mb-2" />
                        <h4 className="font-serif text-[15px] font-semibold text-ink">
                          Select a conversation thread
                        </h4>
                        <p className="mt-1 max-w-sm text-[11.5px] text-ink-faint">
                          Choose a host or guest inquiry on the left to view their sketches, answer questions, or coordinate floor plan drafting.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* FULL-IMAGE SKETCH ZOOM MODAL FOR ARCHITECT DESK */}
      {supportPreviewModalUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] max-w-[92vw] overflow-hidden rounded-2xl bg-white p-3 shadow-2xl">
            <button
              onClick={() => setSupportPreviewModalUrl(null)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-2 flex items-center justify-between border-b border-line pb-2 pr-12">
              <span className="font-serif text-[14px] font-bold text-ink">Host Hand-Drawn Blueprint Sketch</span>
              <a
                href={supportPreviewModalUrl}
                download="host_floorplan_sketch.jpg"
                className="text-[11px] font-medium text-accent hover:underline"
              >
                Download High-Res
              </a>
            </div>
            <img
              src={supportPreviewModalUrl}
              alt="Floor plan sketch zoom preview"
              className="max-h-[82vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* EXPEDITION EDITOR MODAL */}
      {expeditionEditorOpen && editingExpedition && (
        <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-3 backdrop-blur-sm sm:p-5">
          <div className="animate-pop flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Compass className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-serif text-[17px] font-bold text-ink">
                    {editingExpedition.id ? "Edit Expedition Route" : "Create New Expedition"}
                  </h3>
                  <p className="text-[10.5px] text-ink-soft">Configure circuit details, day-by-day stops and 3 budget tiers</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingExpedition(null);
                  setExpeditionEditorOpen(false);
                }}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scroll-warm min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Circuit Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    Expedition Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExpedition.title}
                    onChange={(e) =>
                      setEditingExpedition({ ...editingExpedition, title: e.target.value })
                    }
                    placeholder="e.g. 4-Day Coastal Karnataka & Rainforest Trail"
                    className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    Subtitle & Highlights Description
                  </label>
                  <input
                    type="text"
                    value={editingExpedition.subtitle}
                    onChange={(e) =>
                      setEditingExpedition({ ...editingExpedition, subtitle: e.target.value })
                    }
                    placeholder="e.g. Dandeli Jungle ➔ Murudeshwar Coast ➔ Gokarna Beaches"
                    className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    Region / State
                  </label>
                  <input
                    type="text"
                    value={editingExpedition.region}
                    onChange={(e) =>
                      setEditingExpedition({ ...editingExpedition, region: e.target.value })
                    }
                    placeholder="e.g. Western Ghats, Karnataka"
                    className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    Best Season to Visit
                  </label>
                  <input
                    type="text"
                    value={editingExpedition.season}
                    onChange={(e) =>
                      setEditingExpedition({ ...editingExpedition, season: e.target.value })
                    }
                    placeholder="e.g. October to March"
                    className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    Recommended Vehicle
                  </label>
                  <input
                    type="text"
                    value={editingExpedition.vehicleType}
                    onChange={(e) =>
                      setEditingExpedition({ ...editingExpedition, vehicleType: e.target.value })
                    }
                    placeholder="e.g. Car / Bike / SUV"
                    className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    YouTube Vlog Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={editingExpedition.youtubeUrl}
                    onChange={(e) =>
                      setEditingExpedition({ ...editingExpedition, youtubeUrl: e.target.value })
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    Cover Photo URL
                  </label>
                  <input
                    type="url"
                    value={editingExpedition.coverPhoto}
                    onChange={(e) =>
                      setEditingExpedition({ ...editingExpedition, coverPhoto: e.target.value })
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>
              </div>

              {/* Day-by-Day Editor */}
              <div className="border-t border-line pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-ink text-[13px]">
                    Day-by-Day Stops & 3-Tier Stays ({editingExpedition.days.length} Days)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const nextDayNum = editingExpedition.days.length + 1;
                      const newDay: ExpeditionDay = {
                        dayNumber: nextDayNum,
                        fromLocation: "Previous Stop",
                        toLocation: "Next Stop",
                        distanceKm: 150,
                        driveTime: "3.5 hrs",
                        highlights: ["Scenic Viewpoint"],
                        founderTips: "Great road conditions.",
                        stays: {
                          backpacker: {
                            name: "Backpacker Tent / Camp",
                            type: "tent",
                            pricePerNight: 699,
                            photo: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=600&q=80",
                            features: ["Campfire", "Riverside"],
                          },
                          comfort: {
                            name: "Comfort Nature Cottage",
                            type: "cottage",
                            pricePerNight: 2800,
                            photo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
                            features: ["AC Cottage", "Breakfast"],
                          },
                          luxury: {
                            name: "Luxury Resort Villa",
                            type: "villa",
                            pricePerNight: 8500,
                            photo: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
                            features: ["Private Pool", "Valley View"],
                          },
                        },
                      };
                      setEditingExpedition({
                        ...editingExpedition,
                        days: [...editingExpedition.days, newDay],
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-paper-deep px-3 py-1 text-[11px] font-semibold text-ink hover:bg-paper border border-line"
                  >
                    <Plus className="h-3.5 w-3.5 text-accent" /> Add Day {editingExpedition.days.length + 1}
                  </button>
                </div>

                <div className="space-y-4">
                  {editingExpedition.days.map((day, dIdx) => (
                    <div
                      key={day.dayNumber}
                      className="rounded-xl border border-line bg-paper/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <span className="font-bold text-ink text-[12.5px]">Day {day.dayNumber} Route</span>
                        {editingExpedition.days.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedDays = editingExpedition.days.filter((_, i) => i !== dIdx);
                              setEditingExpedition({ ...editingExpedition, days: updatedDays });
                            }}
                            className="text-[10.5px] text-red-600 hover:underline"
                          >
                            Remove Day
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-ink-faint">From</label>
                          <input
                            type="text"
                            value={day.fromLocation}
                            onChange={(e) => {
                              const updated = [...editingExpedition.days];
                              updated[dIdx].fromLocation = e.target.value;
                              setEditingExpedition({ ...editingExpedition, days: updated });
                            }}
                            className="h-8 w-full rounded border border-line bg-white px-2 text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-ink-faint">To</label>
                          <input
                            type="text"
                            value={day.toLocation}
                            onChange={(e) => {
                              const updated = [...editingExpedition.days];
                              updated[dIdx].toLocation = e.target.value;
                              setEditingExpedition({ ...editingExpedition, days: updated });
                            }}
                            className="h-8 w-full rounded border border-line bg-white px-2 text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-ink-faint">Distance (km)</label>
                          <input
                            type="number"
                            value={day.distanceKm}
                            onChange={(e) => {
                              const updated = [...editingExpedition.days];
                              updated[dIdx].distanceKm = Number(e.target.value);
                              setEditingExpedition({ ...editingExpedition, days: updated });
                            }}
                            className="h-8 w-full rounded border border-line bg-white px-2 text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-ink-faint">Drive Time</label>
                          <input
                            type="text"
                            value={day.driveTime}
                            onChange={(e) => {
                              const updated = [...editingExpedition.days];
                              updated[dIdx].driveTime = e.target.value;
                              setEditingExpedition({ ...editingExpedition, days: updated });
                            }}
                            className="h-8 w-full rounded border border-line bg-white px-2 text-[11px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-ink-faint">Founder Tips & Notes</label>
                        <input
                          type="text"
                          value={day.founderTips}
                          onChange={(e) => {
                            const updated = [...editingExpedition.days];
                            updated[dIdx].founderTips = e.target.value;
                            setEditingExpedition({ ...editingExpedition, days: updated });
                          }}
                          placeholder="e.g. Leave early, eat at local pitstop..."
                          className="h-8 w-full rounded border border-line bg-white px-2 text-[11px]"
                        />
                      </div>

                      {/* 3 Budget Stays For Day */}
                      <div className="pt-2">
                        <span className="block text-[10.5px] font-semibold text-ink mb-1.5">
                          Stays for Day {day.dayNumber} across 3 Budgets:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Backpacker */}
                          <div className="rounded-lg border border-line bg-white p-2 text-[10px] space-y-1">
                            <span className="font-semibold text-ink">🎒 Backpacker</span>
                            <input
                              type="text"
                              placeholder="Stay name"
                              value={day.stays.backpacker?.name || ""}
                              onChange={(e) => {
                                const updated = [...editingExpedition.days];
                                updated[dIdx].stays.backpacker.name = e.target.value;
                                setEditingExpedition({ ...editingExpedition, days: updated });
                              }}
                              className="h-7 w-full rounded border border-line px-1.5 text-[10px]"
                            />
                            <input
                              type="number"
                              placeholder="₹/night"
                              value={day.stays.backpacker?.pricePerNight || 0}
                              onChange={(e) => {
                                const updated = [...editingExpedition.days];
                                updated[dIdx].stays.backpacker.pricePerNight = Number(e.target.value);
                                setEditingExpedition({ ...editingExpedition, days: updated });
                              }}
                              className="h-7 w-full rounded border border-line px-1.5 text-[10px]"
                            />
                          </div>

                          {/* Comfort */}
                          <div className="rounded-lg border border-line bg-white p-2 text-[10px] space-y-1">
                            <span className="font-semibold text-ink">🌿 Comfort</span>
                            <input
                              type="text"
                              placeholder="Stay name"
                              value={day.stays.comfort?.name || ""}
                              onChange={(e) => {
                                const updated = [...editingExpedition.days];
                                updated[dIdx].stays.comfort.name = e.target.value;
                                setEditingExpedition({ ...editingExpedition, days: updated });
                              }}
                              className="h-7 w-full rounded border border-line px-1.5 text-[10px]"
                            />
                            <input
                              type="number"
                              placeholder="₹/night"
                              value={day.stays.comfort?.pricePerNight || 0}
                              onChange={(e) => {
                                const updated = [...editingExpedition.days];
                                updated[dIdx].stays.comfort.pricePerNight = Number(e.target.value);
                                setEditingExpedition({ ...editingExpedition, days: updated });
                              }}
                              className="h-7 w-full rounded border border-line px-1.5 text-[10px]"
                            />
                          </div>

                          {/* Luxury */}
                          <div className="rounded-lg border border-line bg-white p-2 text-[10px] space-y-1">
                            <span className="font-semibold text-ink">👑 Luxury</span>
                            <input
                              type="text"
                              placeholder="Stay name"
                              value={day.stays.luxury?.name || ""}
                              onChange={(e) => {
                                const updated = [...editingExpedition.days];
                                updated[dIdx].stays.luxury.name = e.target.value;
                                setEditingExpedition({ ...editingExpedition, days: updated });
                              }}
                              className="h-7 w-full rounded border border-line px-1.5 text-[10px]"
                            />
                            <input
                              type="number"
                              placeholder="₹/night"
                              value={day.stays.luxury?.pricePerNight || 0}
                              onChange={(e) => {
                                const updated = [...editingExpedition.days];
                                updated[dIdx].stays.luxury.pricePerNight = Number(e.target.value);
                                setEditingExpedition({ ...editingExpedition, days: updated });
                              }}
                              className="h-7 w-full rounded border border-line px-1.5 text-[10px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setEditingExpedition(null);
                  setExpeditionEditorOpen(false);
                }}
                className="rounded-lg border border-line bg-paper px-4 py-2 text-[11px] font-medium text-ink hover:bg-paper-deep"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveExpedition(editingExpedition)}
                className="rounded-lg bg-ink px-5 py-2 text-[11px] font-semibold text-white hover:bg-ink/90 shadow-sm"
              >
                Save & Update Circuit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-PERSON 2FA QR PAIRING MODAL (ON FOUNDER'S SCREEN) */}
      {pairingTarget && pairingQrUrl && (
        <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm">
          <div className="animate-pop w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-accent">
                  <Smartphone className="h-4.5 w-4.5" />
                </span>
                <div className="text-left">
                  <h3 className="font-serif text-[16px] font-semibold text-ink">In-Person 2FA Enrollment</h3>
                  <p className="text-[10.5px] text-ink-soft">Physical device verification</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPairingTarget(null);
                  setPairingQrUrl(null);
                }}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4">
              <p className="text-[12px] text-ink-soft">
                Have <strong className="text-ink">{pairingTarget.name || pairingTarget.email}</strong> scan this QR code using <strong>Google Authenticator</strong> on their phone:
              </p>

              <div className="mt-3 flex justify-center">
                <div className="rounded-xl border border-line bg-white p-2.5 shadow-sm inline-block">
                  <img
                    src={pairingQrUrl}
                    alt="Google Authenticator QR Code"
                    className="h-48 w-48 object-contain"
                  />
                </div>
              </div>

              <p className="mt-3 text-[10.5px] text-ink-faint">
                Scan via Google Authenticator ➔ Tap '+' ➔ Scan QR code.
                <br />
                This code is never exposed on remote browsers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setPairingTarget(null);
                setPairingQrUrl(null);
              }}
              className="w-full rounded-xl bg-ink py-2 text-[12px] font-semibold text-white hover:bg-ink/90"
            >
              Done Pairing
            </button>
          </div>
        </div>
      )}

      {/* KYC Document Inspector */}
      {viewingKycRequest && (
        <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm">
          <div className="animate-pop flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-serif text-[17px] font-semibold text-ink">Guest Govt ID Inspector</h3>
                  <p className="text-[10px] text-ink-soft">Verified clearance for {viewingKycRequest.guestName}</p>
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
              <div className="rounded-xl border border-line bg-paper p-3 text-[11.5px] space-y-1.5">
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
                  1. Govt Photo ID (Aadhaar / Passport / DL)
                </label>
                {viewingKycRequest.idPhotoUrl ? (
                  viewingKycRequest.idPhotoUrl.startsWith("data:application/pdf") ? (
                    <div className="rounded-xl border border-line bg-paper p-3 text-center">
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
                    <div className="overflow-hidden rounded-xl border border-line bg-paper p-1">
                      <img
                        src={viewingKycRequest.idPhotoUrl}
                        alt="Govt ID Document"
                        className="max-h-60 w-full object-contain rounded-lg"
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
                  <div className="overflow-hidden rounded-xl border border-line bg-paper p-1">
                    <img
                      src={viewingKycRequest.selfieUrl}
                      alt="Guest Live Selfie"
                      className="max-h-60 w-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-faint italic">No live selfie attached</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-line px-5 py-3">
              <button
                type="button"
                onClick={() => setViewingKycRequest(null)}
                className="rounded-lg bg-ink px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-ink/90"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notice Toast */}
      {notice && (
        <div className="animate-toast fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-[11.5px] font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-accent" /> {notice}
        </div>
      )}
    </div>
  );
}
