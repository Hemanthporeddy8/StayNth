import { useState, useMemo } from "react";
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
} from "lucide-react";
import {
  loadReplicaOrders,
  updateReplicaOrder,
  type ReplicaOrder,
  type PropertyRequest,
  type PropertyListing,
} from "@/lib/properties";
import { loadFeatureFlags, saveFeatureFlags, type FeatureFlags } from "@/lib/featureFlags";
import { cn } from "@/utils/cn";

const ADMIN_PIN_KEY = "staynth.admin-pin.v1";
const DEFAULT_PIN = "staynth2026";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<"drafting" | "flags" | "bookings">("drafting");
  const [orders, setOrders] = useState<ReplicaOrder[]>(loadReplicaOrders);
  const [flags, setFlags] = useState<FeatureFlags>(loadFeatureFlags);
  const [selectedOrder, setSelectedOrder] = useState<ReplicaOrder | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const savedPin = useMemo(() => {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN;
  }, []);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === savedPin) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
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
    setTimeout(() => setNotice(null), 2500);
  };

  // Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalPlatformFees = requests.reduce((sum, r) => sum + (r.platformFee || 0), 0);

  return (
    <div className="animate-fade fixed inset-0 z-[95] flex items-center justify-center bg-ink/70 p-3 backdrop-blur-sm sm:p-5">
      <div className="animate-pop flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
              <ShieldCheck className="h-5 w-5 text-accent" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-[20px] text-ink">StayNth Master Admin Console</h2>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[9px] font-bold text-accent">
                  Founder Access
                </span>
              </div>
              <p className="text-[11px] text-ink-soft">
                Manage in-app 3D drafting orders, toggle live feature flags, and monitor bookings.
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

        {/* PIN Authentication Screen */}
        {!isAuthenticated ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-deep text-ink">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-serif text-[20px] text-ink">Enter Master Admin PIN</h3>
            <p className="mt-1 max-w-sm text-[11px] text-ink-soft">
              This area is restricted to StayNth founders and operations staff.
            </p>

            <form onSubmit={handlePinSubmit} className="mt-5 w-full max-w-xs space-y-3">
              <input
                type="password"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Enter PIN (Default: staynth2026)"
                className="h-10 w-full rounded-xl border border-line bg-white px-3 text-center text-[13px] tracking-widest text-ink outline-none focus:border-ink"
              />
              {pinError && (
                <p className="text-[11px] font-medium text-red-600">Incorrect PIN. Try again.</p>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-ink py-2.5 text-[12px] font-semibold text-white transition hover:bg-ink/90"
              >
                Unlock Console →
              </button>
            </form>
          </div>
        ) : (
          /* Main Authenticated Console */
          <>
            {/* Top Navigation Tabs */}
            <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-2">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveTab("drafting")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                    activeTab === "drafting"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink",
                  )}
                >
                  <Layers className="h-3.5 w-3.5" /> 3D Drafting Desk ({orders.length})
                </button>
                <button
                  onClick={() => setActiveTab("flags")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                    activeTab === "flags"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink",
                  )}
                >
                  <Flag className="h-3.5 w-3.5" /> Feature Flags & Toggles
                </button>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                    activeTab === "bookings"
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper hover:text-ink",
                  )}
                >
                  <CalendarCheck className="h-3.5 w-3.5" /> Bookings & Fees ({requests.length})
                </button>
              </div>

              <div className="hidden font-mono text-[10px] text-ink-faint sm:block">
                Listings: <strong className="text-ink">{listings.length}</strong> · Drafting Revenue: <strong className="text-ink">₹{totalRevenue.toLocaleString()}</strong> · Platform Fees: <strong className="text-accent">₹{totalPlatformFees.toLocaleString()}</strong>
              </div>
            </div>

            {/* Content Area */}
            <div className="scroll-warm min-h-0 flex-1 overflow-y-auto p-5">
              {/* TAB 1: 3D DRAFTING ORDERS */}
              {activeTab === "drafting" && (
                <div className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-serif text-[18px] text-ink">In-App 3D Drafting Desk</h3>
                      <p className="text-[11px] text-ink-soft">
                        Review customer blueprints, verify UPI UTR numbers, and complete 3D digital twin orders.
                      </p>
                    </div>
                    <span className="rounded-lg border border-line bg-white px-2.5 py-1 text-[10.5px] font-mono text-ink-soft">
                      {orders.filter((o) => o.status === "pending").length} Pending · {orders.filter((o) => o.status === "in_progress").length} In Progress · {orders.filter((o) => o.status === "completed").length} Completed
                    </span>
                  </div>

                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-white py-14 text-center">
                      <Layers className="mx-auto h-8 w-8 text-ink-faint" />
                      <h4 className="mt-3 font-serif text-[18px] text-ink">No Drafting Orders Yet</h4>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        When property owners order the ₹299 Remote Replica or ₹999 Bengaluru On-Site visit, their orders appear here.
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
                                      : "bg-amber-100 text-amber-800",
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
                                <span>Paid: <strong className="text-accent">₹{order.amount}</strong> (UTR: <code className="bg-paper px-1 rounded">{order.utrNumber}</code>)</span>
                              </div>

                              {order.notes && (
                                <p className="mt-2 rounded-lg bg-paper p-2 text-[10.5px] text-ink-soft">
                                  <strong>Customer Notes:</strong> “{order.notes}”
                                </p>
                              )}

                              {/* Files attached */}
                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-mono text-ink-faint">Attached Drawings ({order.files?.length || 0}):</span>
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

              {/* TAB 2: FEATURE FLAGS (THE ON / OFF SWITCHES) */}
              {activeTab === "flags" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif text-[18px] text-ink">Master Feature Flags & Toggles</h3>
                    <p className="text-[11px] text-ink-soft">
                      Enable or disable customer-facing features in real-time. No code redeployment required.
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
                                  : "bg-neutral-100 text-neutral-600",
                              )}
                            >
                              {flags.roadTripPlanner ? "LIVE FOR ALL USERS" : "OFF / HIDDEN"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                            Controls the interactive multi-destination road trip simulator (Dandeli ➔ Murudeshwar ➔ Gokarna).
                            Keep this <strong>OFF</strong> during initial launch. When you have onboarded hotels along the travel circuit, toggle it <strong>ON</strong> to reveal the planner button and map simulator for all users.
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
                                  : "bg-neutral-100 text-neutral-600",
                              )}
                            >
                              {flags.mobilitySponsors ? "LIVE" : "OFF"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                            Displays featured scooter rentals, airport cabs, and self-drive cars on property detail pages.
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
                                  : "bg-neutral-100 text-neutral-600",
                              )}
                            >
                              {flags.fastTrackKyc ? "LIVE" : "OFF"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                            Allows guests to upload their Govt ID and selfie during booking for instant reception clearance.
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

              {/* TAB 3: BOOKINGS & FEES */}
              {activeTab === "bookings" && (
                <div className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-serif text-[18px] text-ink">Marketplace Bookings & Platform Fees</h3>
                      <p className="text-[11px] text-ink-soft">
                        Track ₹49 platform fee collections and guest check-in requests.
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-accent font-semibold">
                      Total Platform Revenue: ₹{totalPlatformFees.toLocaleString()}
                    </span>
                  </div>

                  {requests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-white py-14 text-center">
                      <CalendarCheck className="mx-auto h-8 w-8 text-ink-faint" />
                      <h4 className="mt-3 font-serif text-[18px] text-ink">No Bookings Yet</h4>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        When guests book stays and pay the ₹49 platform fee, their records appear here.
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
                            <span className="font-mono text-accent font-bold">
                              Platform Fee: ₹{req.platformFee || 49} {req.paymentUtr ? `(UTR: ${req.paymentUtr})` : ""}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft">
                            <span>Guest: <strong>{req.guestName}</strong> ({req.email})</span>
                            <span>Dates: <strong>{req.startDate} → {req.endDate || "N/A"}</strong></span>
                            <span>Hotel Room Tariff: <strong>₹{req.payAtHotel || req.total}</strong></span>
                            {req.fastTrackVerified && (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Fast-Track ID Attached
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-line bg-white px-5 py-3">
              <span className="text-[10px] text-ink-faint">
                StayNth Internal Admin • Changes take effect immediately across all client browsers
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

      {notice && (
        <div className="animate-toast fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-[11px] font-medium text-white shadow-xl">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> {notice}
        </div>
      )}
    </div>
  );
}
