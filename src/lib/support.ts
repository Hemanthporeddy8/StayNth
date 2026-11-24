import { getStoredToken, getStoredUser } from "@/lib/auth";

export type SupportSenderRole = "guest" | "host" | "architect" | "founder" | "admin";

export interface SupportMessage {
  id: string;
  threadId: string;
  userId?: string | null;
  senderName: string;
  senderRole: SupportSenderRole;
  email?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  message: string;
  attachmentUrl?: string | null;
  status: "unread" | "read";
  createdAt: string;
}

export interface SupportThreadSummary {
  threadId: string;
  lastActivity: string;
  messageCount: number;
  unreadCount: number;
  lastSender: string;
  lastMessage: string;
  propertyTitle?: string | null;
  email?: string | null;
}

const THREAD_STORAGE_KEY = "staynth_support_thread_id";

export function getSupportThreadId(): string {
  try {
    let id = localStorage.getItem(THREAD_STORAGE_KEY);
    if (!id) {
      id = "th_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now().toString(36);
      localStorage.setItem(THREAD_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "th_guest_" + Date.now();
  }
}

export async function fetchThreadMessages(threadId: string): Promise<SupportMessage[]> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/support?threadId=${encodeURIComponent(threadId)}`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

export async function sendSupportMessage(payload: {
  threadId: string;
  message: string;
  attachmentUrl?: string | null;
  senderName?: string;
  senderRole?: SupportSenderRole;
  email?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
}): Promise<SupportMessage | null> {
  try {
    const token = getStoredToken();
    const currentUser = getStoredUser();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const body = {
      threadId: payload.threadId,
      message: payload.message,
      attachmentUrl: payload.attachmentUrl || null,
      senderName: payload.senderName || (currentUser ? currentUser.name : "Guest"),
      senderRole: payload.senderRole || (currentUser?.role === "founder" ? "founder" : currentUser?.role === "co_admin" ? "architect" : "guest"),
      email: payload.email || currentUser?.email || null,
      propertyId: payload.propertyId || null,
      propertyTitle: payload.propertyTitle || null,
      userId: currentUser?.id || null,
    };

    const res = await fetch("/api/support", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.message || null;
  } catch {
    return null;
  }
}

export async function markThreadRead(threadId: string): Promise<boolean> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/support/read", {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify({ threadId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminThreads(): Promise<SupportThreadSummary[]> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/support?all=true", {
      headers,
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.threads) ? data.threads : [];
  } catch {
    return [];
  }
}

export function openSupportChat(detail?: {
  propertyTitle?: string;
  propertyId?: string;
  initialMessage?: string;
}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("staynth:open-support", { detail }));
  }
}
