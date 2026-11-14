import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Box,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  Heart,
  Inbox,
  Map as MapIcon,
  GitCompare,
  UserRound,
  BadgeCheck,
  MapPin,
  Maximize,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  Compass,
} from "lucide-react";
import type { Plan } from "@/types";
import { ListPropertyDialog } from "@/components/ListPropertyDialog";
import { PropertyDetail } from "@/components/PropertyDetail";
import { clearDraft, peekDraft } from "@/lib/listingDraft";
import { PropertyMap } from "@/components/PropertyMap";
import { CompareDialog } from "@/components/CompareDialog";
import { WorkspaceDialog, type WorkspaceProfile } from "@/components/WorkspaceDialog";
import { RoadTripPlannerModal } from "@/components/RoadTripPlannerModal";
import { loadFeatureFlags, type FeatureFlags } from "@/lib/featureFlags";
import { AuthModal } from "@/components/AuthModal";
import { fetchCurrentUser, logoutUser, type User } from "@/lib/auth";
import {
  formatPrice,
  PROPERTY_TYPE_LABEL,
  loadListings,
  loadRequests,
  saveListings,
  saveRequests,
  fetchRemoteListings,
  saveRemoteListing,
  deleteRemoteListing,
  patchRemoteListing,
  fetchRemoteRequests,
  saveRemoteRequest,
  patchRemoteRequest,
  type ListingMode,
  type PropertyListing,
  type PropertyRequest,
  type PropertyReview,
  type PropertyReport,
  type PropertyType,
} from "@/lib/properties";
import { cn } from "@/utils/cn";

type Tab = "explore" | "mine" | "requests";
type Sort = "featured" | "price-low" | "price-high" | "area";

const FAVORITES_KEY = "draftline.property-favorites.v1";
const PROFILE_KEY = "draftline.workspace-profile.v1";

function loadProfile(): WorkspaceProfile {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    if (value?.name) return value;
  } catch { /* use a local guest profile */ }
  return { name: "Local owner", email: "", role: "both" };
}

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

function loadFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function PropertiesApp({
  currentPlan,
  floorPlans,
  onBack,
  resumeListing,
  onResumed,
  onDrawInStudio,
}: {
  currentPlan: Plan;
  floorPlans: { name: string; plan: Plan }[];
  onBack: () => void;
  /** True when the owner comes back from Studio and the listing form should reopen. */
  resumeListing: boolean;
  onResumed: () => void;
  onDrawInStudio: (mode: "edit" | "blank") => void;
}) {
  const [listings, setListings] = useState<PropertyListing[]>(loadListings);
  const [requests, setRequests] = useState<PropertyRequest[]>(loadRequests);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [tab, setTab] = useState<Tab>("explore");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | PropertyType>("all");
  const [mode, setMode] = useState<"all" | ListingMode>("all");
  const [sort, setSort] = useState<Sort>("featured");
  const [bhk, setBhk] = useState("all");
  const [catalogView, setCatalogView] = useState<"grid" | "map">("grid");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profile, setProfile] = useState<WorkspaceProfile>(loadProfile);
  const [listOpen, setListOpen] = useState(resumeListing && peekDraft() !== null);
  const openList = () => {
    clearDraft();
    setListOpen(true);
  };
  useEffect(() => {
    if (resumeListing) onResumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selected, setSelected] = useState<{ id: string; view: "photos" | "3d" } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"syncing" | "synced" | "local">("syncing");
  const [featureFlags] = useState<FeatureFlags>(loadFeatureFlags);
  const [roadTripOpen, setRoadTripOpen] = useState(false);

  // Fetch authenticated user on load
  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  // Sync with Cloudflare D1 on mount
  useEffect(() => {
    let cancelled = false;
    async function syncCloud() {
      try {
        const [remoteProperties, remoteRequests] = await Promise.all([
          fetchRemoteListings(),
          fetchRemoteRequests(),
        ]);
        if (cancelled) return;

        if (remoteProperties !== null) {
          if (remoteProperties.length > 0) {
            setListings(remoteProperties);
          } else {
            const seeds = loadListings();
            setListings(seeds);
            for (const item of seeds) {
              await saveRemoteListing(item);
            }
          }
          setSyncStatus("synced");
        } else {
          setSyncStatus("local");
        }

        if (remoteRequests !== null && remoteRequests.length > 0) {
          setRequests(remoteRequests);
        }
      } catch {
        if (!cancelled) setSyncStatus("local");
      }
    }

    syncCloud();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      saveListings(listings);
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [listings]);
  useEffect(() => {
    try {
      saveRequests(requests);
    } catch {
      setStorageWarning(true);
    }
  }, [requests]);
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      setStorageWarning(true);
    }
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { setStorageWarning(true); }
  }, [profile]);
  useEffect(() => {
    const match = window.location.hash.match(/^#property=([A-Za-z0-9_-]+)/);
    if (match && listings.some((listing) => listing.id === match[1])) setSelected({ id: match[1], view: "photos" });
    // Open a shared property link on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = listings.filter((listing) => {
      const isMine = (currentUser && listing.ownerId === currentUser.id) || listing.mine;
      if (tab === "mine" ? !isMine : !listing.published) return false;
      if (type !== "all" && listing.type !== type) return false;
      if (mode !== "all" && listing.mode !== mode) return false;
      if (bhk !== "all" && (bhk === "4" ? listing.bedrooms < 4 : listing.bedrooms !== Number(bhk))) return false;
      if (normalized && !`${listing.title} ${listing.location} ${listing.description}`.toLowerCase().includes(normalized)) return false;
      return true;
    });
    return result.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "area") return b.area - a.area;
      return Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt);
    });
  }, [listings, tab, query, type, mode, bhk, sort]);

  const selectedListing = selected ? listings.find((listing) => listing.id === selected.id) ?? null : null;
  const pendingCount = requests.filter((request) => request.status === "pending").length;

  const addRequest = (request: PropertyRequest) => {
    setRequests((current) => [request, ...current]);
    saveRemoteRequest(request);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const updateRequest = (id: string, status: PropertyRequest["status"]) => {
    const candidate = requests.find((request) => request.id === id);
    if (candidate && status === "approved" && candidate.startDate && candidate.endDate) {
      const conflict = requests.some((other) => other.id !== id && other.status === "approved" && other.propertyId === candidate.propertyId &&
        (!candidate.inventoryId || !other.inventoryId || candidate.inventoryId === other.inventoryId) &&
        datesOverlap(candidate.startDate, candidate.endDate, other.startDate, other.endDate));
      if (conflict) {
        setNotice("Approval blocked — those dates overlap an approved booking");
        return;
      }
    }
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
    patchRemoteRequest(id, status);
    setNotice(`Request ${status}`);
  };

  const openProperty = useCallback((id: string) => setSelected({ id, view: "photos" }), []);
  const addReview = (id: string, review: PropertyReview) => {
    setListings((current) => current.map((listing) => {
      if (listing.id !== id) return listing;
      const reviewsList = [review, ...(listing.reviewsList ?? [])];
      const rating = (listing.rating * listing.reviews + review.rating) / (listing.reviews + 1);
      return { ...listing, reviewsList, rating: Math.round(rating * 10) / 10, reviews: listing.reviews + 1 };
    }));
    setNotice("Review saved locally");
  };
  const addReport = (id: string, report: PropertyReport) => {
    setListings((current) => current.map((listing) => listing.id === id ? { ...listing, reports: [report, ...(listing.reports ?? [])] } : listing));
    setNotice("Report recorded locally for review");
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper text-ink">
      <header className="flex h-[62px] shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2" title="Back to floor plan studio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white"><Building2 className="h-4 w-4" /></span>
            <span className="hidden text-left sm:block">
              <span className="block text-[16px] font-semibold leading-none tracking-[-0.03em]">StayNth</span>
              <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-ink-faint">properties</span>
            </span>
          </button>
          <nav className="ml-1 flex items-center gap-0.5 rounded-xl bg-paper-deep p-1 sm:ml-4">
            {([
              ["explore", "Explore"],
              ["mine", "My listings"],
              ["requests", `Requests${pendingCount ? ` ${pendingCount}` : ""}`],
            ] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={cn("rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition sm:px-3", tab === id ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink")}>
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[8px] uppercase tracking-wide text-ink-faint xl:flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", syncStatus === "synced" ? "bg-emerald-500 animate-pulse" : syncStatus === "syncing" ? "bg-amber-400" : "bg-ink-faint")} />
            {syncStatus === "synced" ? "Cloudflare D1 Cloud Sync" : syncStatus === "syncing" ? "Connecting to D1..." : storageWarning ? "Storage Full" : "Local Storage"}
          </span>
          <button onClick={onBack} className="hidden items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[11px] font-medium text-ink-soft hover:bg-paper-deep md:flex">
            <ArrowLeft className="h-3.5 w-3.5" /> Studio
          </button>

          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-medium text-ink hover:bg-paper-deep transition shadow-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10.5px] font-bold text-white uppercase">
                  {currentUser.name.charAt(0)}
                </span>
                <span className="hidden sm:inline max-w-[90px] truncate">{currentUser.name}</span>
                <ChevronDown className="h-3 w-3 text-ink-faint" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl border border-line bg-white p-1.5 shadow-2xl z-50 animate-pop">
                  <div className="px-3 py-2 border-b border-line-soft">
                    <p className="text-[12px] font-semibold text-ink truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-ink-soft truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setWorkspaceOpen(true);
                    }}
                    className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-ink-soft hover:bg-paper hover:text-ink transition"
                  >
                    <UserRound className="h-3.5 w-3.5" /> Workspace & Backup
                  </button>
                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await logoutUser();
                      setCurrentUser(null);
                      setNotice("Signed out successfully");
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
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[11px] font-medium text-ink hover:bg-paper-deep transition shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <button onClick={openList} className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[11px] font-medium text-white shadow-sm hover:bg-ink/90">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">List property</span><span className="sm:hidden">List</span>
          </button>
        </div>
      </header>

      <main className="scroll-warm min-h-0 flex-1 overflow-y-auto">
        {tab === "requests" ? (
          <RequestsPanel requests={requests} listings={listings} onUpdate={updateRequest} />
        ) : (
          <div className="mx-auto max-w-[1440px] px-3 py-5 sm:px-5 sm:py-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="micro text-accent">{tab === "mine" ? "Owner dashboard" : "Properties with real spatial previews"}</p>
                <h1 className="mt-1 max-w-2xl font-serif text-[34px] leading-[1.03] tracking-[-0.02em] text-ink sm:text-[44px]">
                  {tab === "mine" ? "Manage your spaces." : "See the space before you book it."}
                </h1>
                <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-ink-soft">
                  {tab === "mine"
                    ? "Publish, unpublish and inspect your listings. Every listing carries its own interactive 3D floor plan."
                    : "Browse homes, apartments and hostels. Open the actual 3D plan, walk through the rooms, then request a booking or viewing."}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <div className="rounded-xl border border-line bg-white px-3 py-2 text-center">
                  <p className="text-[18px] font-semibold leading-none text-ink">{tab === "mine" ? listings.filter((item) => item.mine).length : listings.filter((item) => item.published).length}</p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-wide text-ink-faint">Properties</p>
                </div>
                <div className="rounded-xl border border-line bg-white px-3 py-2 text-center">
                  <p className="text-[18px] font-semibold leading-none text-ink">{requests.length}</p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-wide text-ink-faint">Requests</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-white p-2.5 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <label className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-paper px-3">
                  <Search className="h-4 w-4 shrink-0 text-ink-faint" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by property, neighborhood or city" className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-faint" />
                  {query && <button onClick={() => setQuery("")} className="text-ink-faint hover:text-ink"><X className="h-3.5 w-3.5" /></button>}
                </label>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line p-1">
                    {(["all", "stay", "rent", "sale"] as const).map((value) => (
                      <button key={value} onClick={() => setMode(value)} className={cn("rounded-lg px-2.5 py-1.5 text-[10px] font-medium capitalize", mode === value ? "bg-ink text-white" : "text-ink-soft")}>{value === "all" ? "All" : value}</button>
                    ))}
                  </div>
                  <label className="relative flex shrink-0 items-center">
                    <SlidersHorizontal className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-faint" />
                    <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-10 appearance-none rounded-xl border border-line bg-white pl-8 pr-7 text-[10.5px] text-ink-soft outline-none">
                      <option value="featured">Featured first</option>
                      <option value="price-low">Price: low to high</option>
                      <option value="price-high">Price: high to low</option>
                      <option value="area">Largest area</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-ink-faint" />
                  </label>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line-soft px-1 pt-2">
                <select value={type} onChange={(event) => setType(event.target.value as "all" | PropertyType)} className="h-8 rounded-lg border border-line bg-white px-2 text-[10px] text-ink-soft">
                  <option value="all">All property types</option>
                  {Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={bhk} onChange={(event) => setBhk(event.target.value)} className="h-8 rounded-lg border border-line bg-white px-2 text-[10px] text-ink-soft">
                  <option value="all">Any BHK</option><option value="1">1 BHK / 1 RK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4">4+ BHK</option>
                </select>
                <div className="flex rounded-lg border border-line p-0.5">
                  <button onClick={() => setCatalogView("grid")} className={cn("rounded-md px-2.5 py-1 text-[9.5px]", catalogView === "grid" ? "bg-ink text-white" : "text-ink-soft")}>Grid</button>
                  <button onClick={() => setCatalogView("map")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[9.5px]", catalogView === "map" ? "bg-ink text-white" : "text-ink-soft")}><MapIcon className="h-3 w-3" /> Map</button>
                </div>
                {featureFlags.roadTripPlanner && (
                  <button
                    onClick={() => setRoadTripOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-1 text-[9.5px] font-semibold text-accent hover:border-accent shadow-2xs transition"
                  >
                    <Compass className="h-3.5 w-3.5 text-accent animate-pulse" />
                    <span>Road Trip Planner</span>
                  </button>
                )}
                <button onClick={() => setCompareOpen(true)} disabled={compareIds.length < 2} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[9.5px] text-ink-soft disabled:opacity-40"><GitCompare className="h-3 w-3" /> Compare ({compareIds.length})</button>
                <span className="ml-auto shrink-0 pr-2 font-mono text-[9px] uppercase tracking-wide text-ink-faint">{visible.length} result{visible.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            {catalogView === "map" ? (
              <PropertyMap listings={visible} onOpen={openProperty} />
            ) : visible.length ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visible.map((listing) => (
                  <PropertyCard
                    key={listing.id}
                    listing={listing}
                    favorite={favorites.includes(listing.id)}
                    managing={tab === "mine"}
                    comparing={compareIds.includes(listing.id)}
                    onCompare={() => setCompareIds((current) => current.includes(listing.id) ? current.filter((id) => id !== listing.id) : current.length < 3 ? [...current, listing.id] : current)}
                    onVerify={() => {
                      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, verification: "pending" } : item));
                      setNotice("Verification request saved as pending");
                    }}
                    onFavorite={() => toggleFavorite(listing.id)}
                    onOpen={(view) => setSelected({ id: listing.id, view })}
                    onToggle={() => {
                      const nextPublished = !listing.published;
                      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, published: nextPublished } : item));
                      patchRemoteListing(listing.id, { published: nextPublished });
                      setNotice(nextPublished ? "Listing published" : "Listing unpublished");
                    }}
                    onDelete={() => {
                      if (!window.confirm(`Delete “${listing.title}” from this browser?`)) return;
                      setListings((current) => current.filter((item) => item.id !== listing.id));
                      deleteRemoteListing(listing.id);
                      setNotice("Listing deleted");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-line bg-white px-5 py-16 text-center">
                <Building2 className="mx-auto h-7 w-7 text-ink-faint" />
                <h3 className="mt-3 font-serif text-[23px] text-ink">{tab === "mine" ? "Your first listing starts here" : "No properties match"}</h3>
                <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-ink-soft">{tab === "mine" ? "Publish a property with your current plan and its 3D walkthrough." : "Try clearing the search or changing the property filters."}</p>
                <button onClick={() => tab === "mine" ? openList() : (setQuery(""), setType("all"), setMode("all"))} className="mt-4 rounded-lg bg-ink px-4 py-2 text-[11px] font-medium text-white">
                  {tab === "mine" ? "List a property" : "Clear filters"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {listOpen && (
        <ListPropertyDialog
          currentPlan={currentPlan}
          floorPlans={floorPlans}
          onClose={() => {
            clearDraft();
            setListOpen(false);
          }}
          onDrawInStudio={onDrawInStudio}
          onCreate={(listing) => {
            clearDraft();
            const enriched: PropertyListing = {
              ...listing,
              ownerId: currentUser?.id,
              ownerName: currentUser ? currentUser.name : listing.ownerName,
              mine: true,
            };
            setListings((current) => [enriched, ...current]);
            saveRemoteListing(enriched);
            setListOpen(false);
            setQuery("");
            setType("all");
            setMode("all");
            setSort("featured");
            setCatalogView("grid");
            setTab("mine");
            // Land on the new property so its 3D walkthrough is the first thing the owner sees.
            setSelected({ id: listing.id, view: "3d" });
            setNotice("Published — saved to Cloudflare D1 & live in 3D");
          }}
        />
      )}

      {selectedListing && selected && (
        <PropertyDetail
          listing={selectedListing}
          initialView={selected.view}
          onClose={() => setSelected(null)}
          onRequest={addRequest}
          requests={requests.filter((request) => request.propertyId === selectedListing.id)}
          onReview={(review) => addReview(selectedListing.id, review)}
          onReport={(report) => addReport(selectedListing.id, report)}
          onOpenRequests={() => {
            setSelected(null);
            setTab("requests");
          }}
        />
      )}

      {compareIds.length > 0 && !compareOpen && (
        <button onClick={() => compareIds.length >= 2 ? setCompareOpen(true) : setNotice("Select one more property to compare")} className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] text-white shadow-xl"><GitCompare className="h-3.5 w-3.5" /> {compareIds.length} selected · Compare</button>
      )}
      {compareOpen && (
        <CompareDialog listings={listings.filter((listing) => compareIds.includes(listing.id))} onClose={() => setCompareOpen(false)} onRemove={(id) => { setCompareIds((current) => current.filter((item) => item !== id)); if (compareIds.length <= 2) setCompareOpen(false); }} onOpen3D={(id) => { setCompareOpen(false); setSelected({ id, view: "3d" }); }} />
      )}
      {workspaceOpen && (
        <WorkspaceDialog
          profile={profile}
          onSave={setProfile}
          onClose={() => setWorkspaceOpen(false)}
          onExport={() => {
            const blob = new Blob([JSON.stringify({ version: 1, profile, listings, requests, favorites }, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "staynth-workspace.json";
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice("Workspace exported");
          }}
          onImport={(value) => {
            const data = value as { profile?: WorkspaceProfile; listings?: PropertyListing[]; requests?: PropertyRequest[]; favorites?: string[] };
            if (!Array.isArray(data.listings) || !data.listings.every((listing) => listing.id && listing.plan)) {
              setNotice("Import failed — not a valid StayNth workspace");
              return;
            }
            setListings(data.listings);
            if (Array.isArray(data.requests)) setRequests(data.requests);
            if (Array.isArray(data.favorites)) setFavorites(data.favorites);
            if (data.profile?.name) setProfile(data.profile);
            setNotice("Workspace imported");
          }}
        />
      )}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setNotice(`Welcome, ${user.name}!`);
        }}
      />
      <RoadTripPlannerModal
        isOpen={roadTripOpen}
        onClose={() => setRoadTripOpen(false)}
        listings={listings}
        onRequestBooking={(newReq) => {
          saveRequests([newReq, ...requests]);
          setRequests((prev) => [newReq, ...prev]);
          setNotice(`Trip Stop Booked: ${newReq.propertyTitle}`);
        }}
      />
      {notice && (
        <div className="animate-toast fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] font-medium text-white shadow-xl">
          <Check className="h-3.5 w-3.5" /> {notice}
        </div>
      )}
    </div>
  );
}

function PropertyCard({
  listing,
  favorite,
  managing,
  comparing,
  onCompare,
  onVerify,
  onFavorite,
  onOpen,
  onToggle,
  onDelete,
}: {
  listing: PropertyListing;
  favorite: boolean;
  managing: boolean;
  comparing: boolean;
  onCompare: () => void;
  onVerify: () => void;
  onFavorite: () => void;
  onOpen: (view: "photos" | "3d") => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
        <button onClick={() => onOpen("photos")} className="h-full w-full" aria-label={`Open ${listing.title}`}>
          {listing.photos.length ? (
            <img src={listing.photos[0].url} alt={listing.photos[0].alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center text-ink-faint"><ImagesIcon /><span className="mt-2 text-[10px]">No photos yet</span></span>
          )}
        </button>
        <button onClick={onFavorite} className={cn("absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/90 shadow-sm backdrop-blur transition", favorite ? "text-accent" : "text-ink-soft")} aria-label={favorite ? "Remove from favorites" : "Save to favorites"}>
          <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
        </button>
        <button onClick={() => onOpen("3d")} className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-white/50 bg-ink/75 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wide text-white backdrop-blur transition hover:bg-ink">
          <Box className="h-3 w-3" /> View in 3D
        </button>
        {!listing.published && <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-1 font-mono text-[8px] uppercase text-ink-soft">Unpublished</span>}
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="micro flex items-center gap-1 text-ink-faint">{PROPERTY_TYPE_LABEL[listing.type]} · {listing.bedrooms} BHK {listing.verification === "verified" && <BadgeCheck className="h-3 w-3 text-blueprint" />}</p>
            <h3 className="mt-1 truncate text-[14px] font-semibold tracking-[-0.02em] text-ink">{listing.title}</h3>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-ink-soft"><Star className="h-3 w-3 fill-current text-accent" />{listing.reviews ? listing.rating : "New"}</span>
        </div>
        <p className="mt-1 flex items-center gap-1 truncate text-[10.5px] text-ink-faint"><MapPin className="h-3 w-3" /> {listing.location}</p>
        <div className="mt-3 flex items-center gap-3 border-t border-line-soft pt-2.5 font-mono text-[9px] text-ink-soft">
          <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {listing.bedrooms}</span>
          <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {listing.bathrooms}</span>
          <span className="flex items-center gap-1"><Maximize className="h-3 w-3" /> {listing.area.toLocaleString()} ft²</span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">{formatPrice(listing)}</p>
          <span className="flex items-center gap-2">
            <button onClick={onCompare} className={cn("flex items-center gap-1 text-[10px] font-medium", comparing ? "text-accent" : "text-ink-faint hover:text-ink")}><GitCompare className="h-3 w-3" /> {comparing ? "Selected" : "Compare"}</button>
            <button onClick={() => onOpen("photos")} className="flex items-center gap-1 text-[10px] font-medium text-ink-faint hover:text-ink"><Eye className="h-3 w-3" /> Details</button>
          </span>
        </div>
        {managing && (
          <div className="mt-3 flex gap-1.5 border-t border-line-soft pt-2.5">
            <button onClick={onToggle} className="flex-1 rounded-lg border border-line py-1.5 text-[10px] font-medium text-ink-soft hover:bg-paper">{listing.published ? "Unpublish" : "Publish"}</button>
            <button onClick={() => onOpen("3d")} className="flex-1 rounded-lg border border-line py-1.5 text-[10px] font-medium text-ink-soft hover:bg-paper">Inspect 3D</button>
            {listing.verification !== "verified" && <button onClick={onVerify} disabled={listing.verification === "pending"} className="rounded-lg border border-line px-2 text-[9px] text-ink-soft disabled:opacity-50">{listing.verification === "pending" ? "Pending" : "Verify"}</button>}
            <button onClick={onDelete} className="rounded-lg border border-red-100 px-2 text-red-500 hover:bg-red-50" aria-label="Delete listing"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
    </article>
  );
}

function RequestsPanel({
  requests,
  listings,
  onUpdate,
}: {
  requests: PropertyRequest[];
  listings: PropertyListing[];
  onUpdate: (id: string, status: PropertyRequest["status"]) => void;
}) {
  const [selectedKycRequest, setSelectedKycRequest] = useState<PropertyRequest | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <p className="micro text-accent">Local request manager</p>
      <h1 className="mt-1 font-serif text-[36px] text-ink">Booking & viewing requests</h1>
      <p className="mt-1 text-[12px] text-ink-soft">Review requests created on this device. Approving changes the local status; it does not send email or take payment.</p>
      {requests.length ? (
        <div className="mt-5 space-y-3">
          {requests.map((request) => {
            const listing = listings.find((item) => item.id === request.propertyId);
            return (
              <article key={request.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide", request.status === "approved" ? "bg-green-50 text-green-700" : request.status === "declined" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700")}>{request.status}</span>
                      <span className="font-mono text-[8.5px] uppercase tracking-wide text-ink-faint">{request.kind} · {request.id}</span>
                      {request.fastTrackVerified && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-wide text-emerald-700">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" /> ⚡ 10-Sec Fast-Track Check-In
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-[15px] font-semibold text-ink">{request.propertyTitle}</h3>
                    <p className="mt-1 text-[11px] text-ink-soft">{request.guestName} · {request.email}</p>
                    <div className="mt-2 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                      <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> {request.startDate}{request.endDate ? ` → ${request.endDate}` : ""}</span>
                      {request.kind === "booking" && <span>{request.guests} guest{request.guests > 1 ? "s" : ""}</span>}
                      {listing && <span>{listing.location}</span>}
                    </div>

                    {/* Financial details & platform fee breakdown */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                      {request.platformFee !== undefined && request.platformFee > 0 && (
                        <span className="flex items-center gap-1 font-medium text-accent">
                          <Sparkles className="h-3 w-3" /> Platform Fee: ₹{request.platformFee} {request.paymentUtr ? `(Paid · UTR: ${request.paymentUtr})` : "(Paid via UPI)"}
                        </span>
                      )}
                      {request.total > 0 && (
                        <span className="font-semibold text-ink">
                          Pay at Hotel: ₹{(request.payAtHotel ?? request.total).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Fast-Track ID Preview Button for receptionists */}
                    {(request.idPhotoUrl || request.selfieUrl) && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedKycRequest(request)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50/70 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> View Fast-Track ID & Live Selfie
                        </button>
                      </div>
                    )}

                    {request.message && <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[11px] leading-relaxed text-ink-soft">“{request.message}”</p>}
                  </div>
                  {request.status === "pending" ? (
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={() => onUpdate(request.id, "approved")} className="rounded-lg bg-ink px-3 py-2 text-[10px] font-medium text-white">Approve</button>
                      <button onClick={() => onUpdate(request.id, "declined")} className="rounded-lg border border-line px-3 py-2 text-[10px] font-medium text-ink-soft">Decline</button>
                    </div>
                  ) : (
                    <button onClick={() => onUpdate(request.id, "pending")} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-[10px] text-ink-faint">Reopen</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <Inbox className="mx-auto h-7 w-7 text-ink-faint" />
          <h3 className="mt-3 font-serif text-[23px] text-ink">No requests yet</h3>
          <p className="mt-1 text-[11px] text-ink-soft">Open a property and submit a booking or viewing request to see it here.</p>
        </div>
      )}

      {selectedKycRequest && (
        <FastTrackKycModal
          request={selectedKycRequest}
          onClose={() => setSelectedKycRequest(null)}
        />
      )}
    </div>
  );
}

function FastTrackKycModal({
  request,
  onClose,
}: {
  request: PropertyRequest;
  onClose: () => void;
}) {
  return (
    <div className="animate-fade fixed inset-0 z-[85] flex items-center justify-center bg-ink/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="animate-pop flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-serif text-[17px] leading-tight text-ink">10-Second Express Check-In KYC</h3>
              <p className="text-[10px] text-ink-soft">Digital verification for reception clearance</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scroll-warm min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-xl border border-line bg-white p-3 text-[11px] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-ink-faint">Guest Name</span>
              <span className="font-semibold text-ink">{request.guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Email</span>
              <span className="text-ink">{request.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Check-In</span>
              <span className="font-mono text-ink">{request.startDate}</span>
            </div>
            {request.paymentUtr && (
              <div className="flex justify-between">
                <span className="text-ink-faint">UPI UTR Ref</span>
                <span className="font-mono font-medium text-ink">{request.paymentUtr}</span>
              </div>
            )}
          </div>

          {/* Govt ID */}
          <div>
            <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
              1. Govt Photo ID (Aadhaar / Passport / DL)
            </label>
            {request.idPhotoUrl ? (
              request.idPhotoUrl.startsWith("data:application/pdf") ? (
                <div className="rounded-xl border border-line bg-white p-3 text-center">
                  <p className="text-[11px] text-ink-soft">Govt ID attached as PDF document</p>
                  <a
                    href={request.idPhotoUrl}
                    download={`Govt-ID-${request.guestName}.pdf`}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-[10.5px] font-medium text-white"
                  >
                    Download ID PDF
                  </a>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-line bg-white p-1">
                  <img src={request.idPhotoUrl} alt="Govt ID Document" className="max-h-60 w-full object-contain rounded-lg bg-paper" />
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
            {request.selfieUrl ? (
              <div className="overflow-hidden rounded-xl border border-line bg-white p-1">
                <img src={request.selfieUrl} alt="Guest Live Selfie" className="max-h-60 w-full object-contain rounded-lg bg-paper" />
              </div>
            ) : (
              <p className="text-[11px] text-ink-faint italic">No live selfie attached</p>
            )}
          </div>

          <div className="rounded-lg bg-emerald-50/60 border border-emerald-200/80 p-2.5 text-[10px] text-emerald-800">
            <span className="font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Identity Verified for Instant Key Handover
            </span>
            <p className="mt-0.5 text-[9.5px] text-emerald-700">
              Matches guest check-in requirements. Document will be automatically purged 7 days after checkout.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-line bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-ink px-4 py-2 text-[11px] font-semibold text-white hover:bg-ink/90"
          >
            Close Record
          </button>
        </div>
      </div>
    </div>
  );
}

function ImagesIcon() {
  return <Box className="h-7 w-7" />;
}

