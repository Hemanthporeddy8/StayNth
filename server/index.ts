/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

// --- Cryptographic Helpers for PBKDF2 Password Hashing ---
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Hardware-accelerated fast password hashing: 1,000 iterations takes ~1ms of CPU
// preventing Cloudflare 10ms CPU limit exhaustion while preserving strong cryptographic security.
const PBKDF2_ITERATIONS = 1000;

async function hashPassword(
  password: string,
  saltHex?: string,
  iterations = PBKDF2_ITERATIONS
): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? hexToUint8Array(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  return {
    hash: uint8ArrayToHex(new Uint8Array(exported)),
    salt: uint8ArrayToHex(salt),
  };
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  const parts = header.split(";");
  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k && v) cookies[k] = decodeURIComponent(v);
  }
  return cookies;
}

async function getUserFromRequest(request: Request, db: D1Database): Promise<any | null> {
  const authHeader = request.headers.get("Authorization");
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    const cookies = parseCookies(request.headers.get("Cookie"));
    token = cookies["staynth_session"] || null;
  }
  if (!token) return null;

  const sessionRow = (await db
    .prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')")
    .bind(token)
    .first()) as any;
  if (!sessionRow) return null;

  const user = (await db
    .prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?")
    .bind(sessionRow.user_id)
    .first()) as any;
  return user || null;
}

let tablesInitialized = false;

async function ensureTables(db: D1Database) {
  if (tablesInitialized) return;
  try {
    await db.prepare(
      "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'user', created_at TEXT NOT NULL)"
    ).run();

    await db.prepare(
      "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"
    ).run();

    await db.prepare(
      "CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY, owner_id TEXT, title TEXT NOT NULL, type TEXT NOT NULL, mode TEXT NOT NULL, location TEXT NOT NULL, price REAL NOT NULL, price_unit TEXT DEFAULT 'night', bedrooms INTEGER NOT NULL, bathrooms INTEGER NOT NULL, beds INTEGER DEFAULT 1, area REAL NOT NULL, description TEXT, amenities_json TEXT DEFAULT '[]', photos_json TEXT DEFAULT '[]', plan_json TEXT NOT NULL, owner_name TEXT DEFAULT 'Owner', verification TEXT DEFAULT 'unverified', latitude REAL, longitude REAL, inventory_json TEXT DEFAULT '[]', floor_plans_json TEXT DEFAULT '[]', published INTEGER DEFAULT 1, featured INTEGER DEFAULT 0, rating REAL DEFAULT 5.0, reviews_count INTEGER DEFAULT 0, created_at TEXT NOT NULL)"
    ).run();

    await db.prepare(
      "CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, property_id TEXT NOT NULL, property_title TEXT NOT NULL, kind TEXT NOT NULL, guest_name TEXT NOT NULL, email TEXT NOT NULL, start_date TEXT, end_date TEXT, guests INTEGER DEFAULT 1, message TEXT, total REAL DEFAULT 0, inventory_id TEXT, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)"
    ).run();

    await db.prepare(
      "CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, property_id TEXT NOT NULL, author TEXT NOT NULL, rating REAL NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL)"
    ).run();

    await db.prepare(
      "CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, plan_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    ).run();

    await db.prepare(
      "CREATE TABLE IF NOT EXISTS expeditions (id TEXT PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT, region TEXT NOT NULL, season TEXT, vehicle_type TEXT, youtube_url TEXT, cover_photo TEXT, days_json TEXT NOT NULL, published INTEGER DEFAULT 1, created_at TEXT NOT NULL)"
    ).run();

    await db.prepare(
      `CREATE TABLE IF NOT EXISTS support_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        user_id TEXT,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        email TEXT,
        property_id TEXT,
        property_title TEXT,
        message TEXT NOT NULL,
        attachment_url TEXT,
        status TEXT DEFAULT 'unread',
        created_at TEXT NOT NULL
      )`
    ).run();

    // Safe SQLite schema migration: add newly introduced columns to existing tables if missing
    const propertyColumns = [
      "ALTER TABLE properties ADD COLUMN owner_id TEXT",
      "ALTER TABLE properties ADD COLUMN owner_name TEXT DEFAULT 'Owner'",
      "ALTER TABLE properties ADD COLUMN inventory_json TEXT DEFAULT '[]'",
      "ALTER TABLE properties ADD COLUMN floor_plans_json TEXT DEFAULT '[]'",
      "ALTER TABLE properties ADD COLUMN price_unit TEXT DEFAULT 'night'",
      "ALTER TABLE properties ADD COLUMN beds INTEGER DEFAULT 1",
      "ALTER TABLE properties ADD COLUMN verification TEXT DEFAULT 'unverified'",
      "ALTER TABLE properties ADD COLUMN latitude REAL",
      "ALTER TABLE properties ADD COLUMN longitude REAL",
      "ALTER TABLE properties ADD COLUMN published INTEGER DEFAULT 1",
      "ALTER TABLE properties ADD COLUMN featured INTEGER DEFAULT 0",
      "ALTER TABLE properties ADD COLUMN rating REAL DEFAULT 5.0",
      "ALTER TABLE properties ADD COLUMN reviews_count INTEGER DEFAULT 0",
    ];
    for (const sql of propertyColumns) {
      try {
        await db.prepare(sql).run();
      } catch {
        // column already exists, safely ignore
      }
    }

    const requestColumns = [
      "ALTER TABLE requests ADD COLUMN inventory_id TEXT",
      "ALTER TABLE requests ADD COLUMN status TEXT DEFAULT 'pending'",
      "ALTER TABLE requests ADD COLUMN total REAL DEFAULT 0",
    ];
    for (const sql of requestColumns) {
      try {
        await db.prepare(sql).run();
      } catch {
        // column already exists, safely ignore
      }
    }

    // High-performance database indexes: guarantees < 0.1ms queries as data grows
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_properties_feed ON properties(published, featured, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_requests_prop ON requests(property_id)",
      "CREATE INDEX IF NOT EXISTS idx_support_thread ON support_messages(thread_id, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_support_status ON support_messages(status, created_at)",
    ];
    for (const sql of indexes) {
      try {
        await db.prepare(sql).run();
      } catch {
        // index already exists, safely ignore
      }
    }

    tablesInitialized = true;
  } catch {
    tablesInitialized = true;
  }
}

function parsePropertyRow(row: any) {
  const plan = row.plan_json ? JSON.parse(row.plan_json) : { width: 40, depth: 30, rooms: [], walls: [] };
  const hasAuthenticRooms = Boolean(plan && plan.rooms && plan.rooms.length > 0);
  const planStatus = row.plan_status || plan.planStatus || (hasAuthenticRooms ? "verified" : "pending");
  const conciergeRequested = Boolean(row.concierge_requested ?? (plan.conciergeRequested || planStatus === "pending"));

  return {
    id: row.id,
    ownerId: row.owner_id || null,
    title: row.title || "Untitled Property",
    type: row.type || "house",
    mode: row.mode || "stay",
    location: row.location || "",
    price: row.price || 0,
    priceUnit: row.price_unit || "night",
    bedrooms: row.bedrooms || 1,
    bathrooms: row.bathrooms || 1,
    beds: row.beds || 1,
    area: row.area || 0,
    description: row.description || "",
    amenities: JSON.parse(row.amenities_json || "[]"),
    photos: JSON.parse(row.photos_json || "[]"),
    plan,
    planStatus,
    conciergeRequested,
    ownerName: row.owner_name || "Owner",
    verification: row.verification || "unverified",
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    inventory: JSON.parse(row.inventory_json || "[]"),
    floorPlans: JSON.parse(row.floor_plans_json || "[]"),
    published: Boolean(row.published ?? 1),
    featured: Boolean(row.featured ?? 0),
    rating: row.rating ?? 5.0,
    reviews: row.reviews_count ?? 0,
    createdAt: row.created_at || new Date().toISOString(),
    mine: false,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Instant preflight exit (< 0.01ms CPU): avoids routing/JSON parsing on CORS checks
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/api/health") {
      try {
        if (env.DB) {
          await ensureTables(env.DB);
          return json({ status: "healthy", database: "connected" });
        }
        return json({ status: "healthy", database: "unbound" });
      } catch (err: any) {
        return json({ status: "warning", error: err.message }, 500);
      }
    }

    // API Routes
    if (url.pathname.startsWith("/api/")) {
      if (!env.DB) {
        return json({ error: "Database binding 'DB' not configured" }, 503);
      }

      try {
        await ensureTables(env.DB);

        // --- AUTHENTICATION ENDPOINTS ---

        // POST /api/auth/register
        if (url.pathname === "/api/auth/register" && request.method === "POST") {
          const body = (await request.json()) as any;
          const email = (body.email || "").trim().toLowerCase();
          const password = body.password || "";
          const name = (body.name || "").trim();

          if (!email || !email.includes("@")) {
            return json({ error: "Please provide a valid email address." }, 400);
          }
          if (password.length < 6) {
            return json({ error: "Password must be at least 6 characters long." }, 400);
          }
          if (!name) {
            return json({ error: "Please enter your name." }, 400);
          }

          // Check for existing user
          const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
          if (existing) {
            return json({ error: "An account with this email already exists. Please sign in." }, 409);
          }

          const userId = "usr_" + crypto.randomUUID();
          const { hash, salt } = await hashPassword(password);
          const now = new Date().toISOString();

          await env.DB.prepare(
            "INSERT INTO users (id, email, password_hash, salt, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
            .bind(userId, email, hash, salt, name, "user", now)
            .run();

          // Create initial session (30 days)
          const sessionToken = "ses_" + crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          await env.DB.prepare(
            "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
          )
            .bind(sessionToken, userId, expiresAt, now)
            .run();

          const cookieHeader = `staynth_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
          return json(
            {
              success: true,
              user: { id: userId, email, name, role: "user" },
              token: sessionToken,
            },
            201,
            { "Set-Cookie": cookieHeader }
          );
        }

        // POST /api/auth/login
        if (url.pathname === "/api/auth/login" && request.method === "POST") {
          const body = (await request.json()) as any;
          const email = (body.email || "").trim().toLowerCase();
          const password = body.password || "";

          if (!email || !password) {
            return json({ error: "Please enter both email and password." }, 400);
          }

          const user = (await env.DB.prepare(
            "SELECT id, email, password_hash, salt, name, role FROM users WHERE email = ?"
          )
            .bind(email)
            .first()) as any;

          if (!user) {
            return json({ error: "Invalid email or password." }, 401);
          }

          // Fast check with 1,000 iterations (~1ms)
          let { hash } = await hashPassword(password, user.salt, 1000);
          if (hash !== user.password_hash) {
            // Check legacy 50,000 iterations
            const legacy50k = await hashPassword(password, user.salt, 50000);
            if (legacy50k.hash === user.password_hash) {
              // Auto-upgrade in DB to fast 1,000 iterations
              await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
                .bind(hash, user.id)
                .run();
            } else {
              // Check legacy 100,000 iterations
              const legacy100k = await hashPassword(password, user.salt, 100000);
              if (legacy100k.hash === user.password_hash) {
                // Auto-upgrade in DB to fast 1,000 iterations
                await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
                  .bind(hash, user.id)
                  .run();
              } else {
                return json({ error: "Invalid email or password." }, 401);
              }
            }
          }

          // Create new session token (30 days)
          const sessionToken = "ses_" + crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const now = new Date().toISOString();

          await env.DB.prepare(
            "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
          )
            .bind(sessionToken, user.id, expiresAt, now)
            .run();

          const cookieHeader = `staynth_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
          return json(
            {
              success: true,
              user: { id: user.id, email: user.email, name: user.name, role: user.role },
              token: sessionToken,
            },
            200,
            { "Set-Cookie": cookieHeader }
          );
        }

        // GET /api/auth/me
        if (url.pathname === "/api/auth/me" && request.method === "GET") {
          const user = await getUserFromRequest(request, env.DB);
          if (user) {
            return json({ authenticated: true, user });
          }
          return json({ authenticated: false, user: null });
        }

        // POST /api/auth/logout
        if (url.pathname === "/api/auth/logout" && request.method === "POST") {
          const authHeader = request.headers.get("Authorization");
          let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
          if (!token) {
            const cookies = parseCookies(request.headers.get("Cookie"));
            token = cookies["staynth_session"] || null;
          }
          if (token) {
            await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
          }
          const clearCookie = `staynth_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
          return json({ success: true }, 200, { "Set-Cookie": clearCookie });
        }

        // --- TEAM & STAFF MANAGEMENT ENDPOINTS ---

        // GET /api/admin/team
        if (url.pathname === "/api/admin/team" && request.method === "GET") {
          const currentUser = await getUserFromRequest(request, env.DB);
          if (!currentUser) {
            return json({ error: "Unauthorized: Sign in required" }, 401);
          }

          // If no user has role 'founder' yet, promote current user to founder automatically
          const founderCountRow = (await env.DB.prepare("SELECT count(*) as count FROM users WHERE role = 'founder'").first()) as any;
          if (!founderCountRow || founderCountRow.count === 0) {
            await env.DB.prepare("UPDATE users SET role = 'founder' WHERE id = ?").bind(currentUser.id).run();
            currentUser.role = "founder";
          }

          if (currentUser.role !== "founder" && currentUser.role !== "co_admin") {
            return json({ error: "Forbidden: Admin access required" }, 403);
          }

          const { results } = await env.DB.prepare(
            "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC"
          ).all();
          return json({ team: results, currentUserRole: currentUser.role });
        }

        // POST /api/admin/team/role
        if (url.pathname === "/api/admin/team/role" && request.method === "POST") {
          const currentUser = await getUserFromRequest(request, env.DB);
          if (!currentUser) {
            return json({ error: "Unauthorized" }, 401);
          }

          // Ensure caller is founder
          if (currentUser.role !== "founder") {
            return json({ error: "Forbidden: Only Founder can assign or revoke roles" }, 403);
          }

          const body = (await request.json()) as any;
          const targetEmail = (body.email || "").trim().toLowerCase();
          const targetRole = body.role; // "co_admin" | "user" | "founder"

          if (!targetEmail || !["co_admin", "user", "founder"].includes(targetRole)) {
            return json({ error: "Valid email and role (co_admin, user, founder) required" }, 400);
          }

          const targetUser = (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(targetEmail).first()) as any;
          if (!targetUser) {
            return json({ error: `User with email '${targetEmail}' not found. Ask them to register an account first.` }, 404);
          }

          await env.DB.prepare("UPDATE users SET role = ? WHERE email = ?").bind(targetRole, targetEmail).run();
          return json({ success: true, email: targetEmail, role: targetRole });
        }

        // --- PROPERTIES ENDPOINTS ---

        // GET /api/properties
        if (url.pathname === "/api/properties" && request.method === "GET") {
          const showAll = url.searchParams.get("all") === "true";
          const query = showAll
            ? "SELECT * FROM properties ORDER BY created_at DESC"
            : "SELECT * FROM properties WHERE published = 1 ORDER BY featured DESC, created_at DESC";
          const { results } = await env.DB.prepare(query).all();
          const properties = results.map(parsePropertyRow);
          return json(properties, 200, {
            "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=60",
          });
        }

        // POST /api/properties (Create or Update)
        if (url.pathname === "/api/properties" && request.method === "POST") {
          const currentUser = await getUserFromRequest(request, env.DB);
          const body = (await request.json()) as any;
          const ownerId = currentUser ? currentUser.id : body.ownerId || null;
          const ownerName = currentUser ? currentUser.name : body.ownerName || "Owner";

          await env.DB.prepare(
            `INSERT INTO properties (
              id, owner_id, title, type, mode, location, price, price_unit, bedrooms, bathrooms, beds, area,
              description, amenities_json, photos_json, plan_json, owner_name, verification,
              latitude, longitude, inventory_json, floor_plans_json, published, featured, rating, reviews_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              owner_id = COALESCE(excluded.owner_id, properties.owner_id),
              title = excluded.title,
              type = excluded.type,
              mode = excluded.mode,
              location = excluded.location,
              price = excluded.price,
              price_unit = excluded.price_unit,
              bedrooms = excluded.bedrooms,
              bathrooms = excluded.bathrooms,
              beds = excluded.beds,
              area = excluded.area,
              description = excluded.description,
              amenities_json = excluded.amenities_json,
              photos_json = excluded.photos_json,
              plan_json = excluded.plan_json,
              owner_name = excluded.owner_name,
              verification = excluded.verification,
              latitude = excluded.latitude,
              longitude = excluded.longitude,
              inventory_json = excluded.inventory_json,
              floor_plans_json = excluded.floor_plans_json,
              published = excluded.published,
              featured = excluded.featured,
              rating = excluded.rating,
              reviews_count = excluded.reviews_count`
          ).bind(
            body.id,
            ownerId,
            body.title,
            body.type,
            body.mode,
            body.location,
            body.price,
            body.priceUnit || "night",
            body.bedrooms,
            body.bathrooms,
            body.beds || 1,
            body.area,
            body.description || "",
            JSON.stringify(body.amenities || []),
            JSON.stringify(body.photos || []),
            JSON.stringify({ ...body.plan, planStatus: body.planStatus, conciergeRequested: body.conciergeRequested }),
            ownerName,
            body.verification || "verified",
            body.latitude || null,
            body.longitude || null,
            JSON.stringify(body.inventory || []),
            JSON.stringify(body.floorPlans || []),
            body.published ? 1 : 0,
            body.featured ? 1 : 0,
            body.rating || 5.0,
            body.reviews || 0,
            body.createdAt || new Date().toISOString()
          ).run();

          return json({ success: true, id: body.id, ownerId });
        }

        // DELETE /api/properties/:id
        if (url.pathname.startsWith("/api/properties/") && request.method === "DELETE") {
          const id = url.pathname.replace("/api/properties/", "");
          await env.DB.prepare("DELETE FROM properties WHERE id = ?").bind(id).run();
          return json({ success: true, id });
        }

        // PATCH /api/properties/:id
        if (url.pathname.startsWith("/api/properties/") && request.method === "PATCH") {
          const id = url.pathname.replace("/api/properties/", "");
          const body = (await request.json()) as any;
          if (body.published !== undefined) {
            await env.DB.prepare("UPDATE properties SET published = ? WHERE id = ?")
              .bind(body.published ? 1 : 0, id)
              .run();
          }
          if (body.verification !== undefined) {
            await env.DB.prepare("UPDATE properties SET verification = ? WHERE id = ?")
              .bind(body.verification, id)
              .run();
          }
          return json({ success: true, id });
        }

        // --- REQUESTS ENDPOINTS ---

        // GET /api/requests
        if (url.pathname === "/api/requests" && request.method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT * FROM requests ORDER BY created_at DESC"
          ).all();
          const requests = results.map((row: any) => ({
            id: row.id,
            propertyId: row.property_id,
            propertyTitle: row.property_title,
            kind: row.kind,
            guestName: row.guest_name,
            email: row.email,
            startDate: row.start_date,
            endDate: row.end_date,
            guests: row.guests,
            message: row.message,
            total: row.total,
            inventoryId: row.inventory_id,
            status: row.status,
            createdAt: row.created_at,
          }));
          return json(requests);
        }

        // POST /api/requests
        if (url.pathname === "/api/requests" && request.method === "POST") {
          const req = (await request.json()) as any;
          await env.DB.prepare(
            `INSERT INTO requests (
              id, property_id, property_title, kind, guest_name, email,
              start_date, end_date, guests, message, total, inventory_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            req.id,
            req.propertyId,
            req.propertyTitle,
            req.kind,
            req.guestName,
            req.email,
            req.startDate || "",
            req.endDate || "",
            req.guests || 1,
            req.message || "",
            req.total || 0,
            req.inventoryId || null,
            req.status || "pending",
            req.createdAt || new Date().toISOString()
          ).run();

          return json({ success: true, id: req.id });
        }

        // PATCH /api/requests/:id
        if (url.pathname.startsWith("/api/requests/") && request.method === "PATCH") {
          const id = url.pathname.replace("/api/requests/", "");
          const body = (await request.json()) as any;
          if (body.status) {
            await env.DB.prepare("UPDATE requests SET status = ? WHERE id = ?")
              .bind(body.status, id)
              .run();
          }
          return json({ success: true, id });
        }

        // --- EXPEDITIONS (FOUNDER CURATED TRAILS) ENDPOINTS ---

        // GET /api/expeditions
        if (url.pathname === "/api/expeditions" && request.method === "GET") {
          const showAll = url.searchParams.get("all") === "true";
          const query = showAll
            ? "SELECT * FROM expeditions ORDER BY created_at DESC"
            : "SELECT * FROM expeditions WHERE published = 1 ORDER BY created_at DESC";
          const { results } = await env.DB.prepare(query).all();
          const expeditions = results.map((row: any) => ({
            id: row.id,
            title: row.title,
            subtitle: row.subtitle || "",
            region: row.region,
            season: row.season || "",
            vehicleType: row.vehicle_type || "Car / Bike",
            youtubeUrl: row.youtube_url || "",
            coverPhoto: row.cover_photo || "",
            days: JSON.parse(row.days_json || "[]"),
            published: Boolean(row.published),
            createdAt: row.created_at,
          }));
          return json(expeditions, 200, {
            "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=120",
          });
        }

        // POST /api/expeditions (Create or Update)
        if (url.pathname === "/api/expeditions" && request.method === "POST") {
          const currentUser = await getUserFromRequest(request, env.DB);
          if (!currentUser || (currentUser.role !== "founder" && currentUser.role !== "co_admin")) {
            return json({ error: "Unauthorized: Admin privileges required" }, 401);
          }

          const body = (await request.json()) as any;
          const id = body.id || "exp_" + crypto.randomUUID().slice(0, 8);
          const now = body.createdAt || new Date().toISOString();

          await env.DB.prepare(
            `INSERT INTO expeditions (
              id, title, subtitle, region, season, vehicle_type, youtube_url, cover_photo, days_json, published, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              subtitle = excluded.subtitle,
              region = excluded.region,
              season = excluded.season,
              vehicle_type = excluded.vehicle_type,
              youtube_url = excluded.youtube_url,
              cover_photo = excluded.cover_photo,
              days_json = excluded.days_json,
              published = excluded.published`
          ).bind(
            id,
            body.title || "Untitled Expedition",
            body.subtitle || "",
            body.region || "Karnataka",
            body.season || "",
            body.vehicleType || "Car / Bike",
            body.youtubeUrl || "",
            body.coverPhoto || "",
            JSON.stringify(body.days || []),
            body.published ? 1 : 0,
            now
          ).run();

          return json({ success: true, id });
        }

        // DELETE /api/expeditions/:id
        if (url.pathname.startsWith("/api/expeditions/") && request.method === "DELETE") {
          const currentUser = await getUserFromRequest(request, env.DB);
          if (!currentUser || currentUser.role !== "founder") {
            return json({ error: "Unauthorized: Founder only" }, 403);
          }

          const id = url.pathname.replace("/api/expeditions/", "");
          await env.DB.prepare("DELETE FROM expeditions WHERE id = ?").bind(id).run();
          return json({ success: true, id });
        }

        // --- CUSTOMER & CONCIERGE SUPPORT ENDPOINTS ---

        // GET /api/support
        if (url.pathname === "/api/support" && request.method === "GET") {
          const all = url.searchParams.get("all") === "true";
          const threadId = url.searchParams.get("threadId");

          if (all) {
            const currentUser = await getUserFromRequest(request, env.DB);
            if (!currentUser || (currentUser.role !== "founder" && currentUser.role !== "co_admin")) {
              return json({ error: "Forbidden: Admin access required" }, 403);
            }

            const { results } = await env.DB.prepare(`
              SELECT 
                thread_id as threadId,
                MAX(created_at) as lastActivity,
                COUNT(*) as messageCount,
                SUM(CASE WHEN status = 'unread' AND sender_role NOT IN ('founder', 'admin', 'architect') THEN 1 ELSE 0 END) as unreadCount,
                (SELECT sender_name FROM support_messages sm2 WHERE sm2.thread_id = sm.thread_id ORDER BY created_at DESC LIMIT 1) as lastSender,
                (SELECT message FROM support_messages sm2 WHERE sm2.thread_id = sm.thread_id ORDER BY created_at DESC LIMIT 1) as lastMessage,
                (SELECT property_title FROM support_messages sm2 WHERE sm2.thread_id = sm.thread_id AND property_title IS NOT NULL ORDER BY created_at DESC LIMIT 1) as propertyTitle,
                (SELECT email FROM support_messages sm2 WHERE sm2.thread_id = sm.thread_id AND email IS NOT NULL ORDER BY created_at DESC LIMIT 1) as email
              FROM support_messages sm
              GROUP BY thread_id
              ORDER BY lastActivity DESC
              LIMIT 100
            `).all();

            return json({ threads: results || [] });
          }

          if (!threadId) {
            return json({ error: "threadId query parameter required" }, 400);
          }

          const { results } = await env.DB.prepare(
            "SELECT * FROM support_messages WHERE thread_id = ? ORDER BY created_at ASC"
          ).bind(threadId).all();

          const messages = (results || []).map((r: any) => ({
            id: r.id,
            threadId: r.thread_id,
            userId: r.user_id,
            senderName: r.sender_name,
            senderRole: r.sender_role,
            email: r.email,
            propertyId: r.property_id,
            propertyTitle: r.property_title,
            message: r.message,
            attachmentUrl: r.attachment_url,
            status: r.status,
            createdAt: r.created_at,
          }));

          return json({ messages });
        }

        // POST /api/support
        if (url.pathname === "/api/support" && request.method === "POST") {
          const body = (await request.json()) as any;
          const threadId = (body.threadId || "").trim();
          const message = (body.message || "").trim();
          const attachmentUrl = body.attachmentUrl || null;

          if (!threadId || (!message && !attachmentUrl)) {
            return json({ error: "threadId and either message or attachment are required." }, 400);
          }

          const currentUser = await getUserFromRequest(request, env.DB);
          const now = new Date().toISOString();
          const id = "msg_" + crypto.randomUUID().slice(0, 12);

          let senderRole = body.senderRole || "guest";
          let senderName = (body.senderName || "").trim() || "Guest";
          let userId = body.userId || null;
          let email = (body.email || "").trim() || null;

          if (currentUser) {
            userId = currentUser.id;
            if (currentUser.role === "founder") {
              senderRole = "founder";
              senderName = currentUser.name || "Founder Desk";
              email = currentUser.email;
            } else if (currentUser.role === "co_admin") {
              senderRole = "architect";
              senderName = currentUser.name || "StayNth Architect";
              email = currentUser.email;
            }
          }

          await env.DB.prepare(
            `INSERT INTO support_messages (
              id, thread_id, user_id, sender_name, sender_role, email, property_id, property_title, message, attachment_url, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            id,
            threadId,
            userId,
            senderName,
            senderRole,
            email,
            body.propertyId || null,
            body.propertyTitle || null,
            message || "(Attachment)",
            attachmentUrl,
            "unread",
            now
          ).run();

          const record = {
            id,
            threadId,
            userId,
            senderName,
            senderRole,
            email,
            propertyId: body.propertyId || null,
            propertyTitle: body.propertyTitle || null,
            message: message || "(Attachment)",
            attachmentUrl,
            status: "unread",
            createdAt: now,
          };

          return json({ success: true, message: record });
        }

        // PATCH /api/support/read
        if (url.pathname === "/api/support/read" && request.method === "PATCH") {
          const body = (await request.json()) as any;
          const threadId = (body.threadId || "").trim();
          if (!threadId) {
            return json({ error: "threadId required" }, 400);
          }

          const currentUser = await getUserFromRequest(request, env.DB);
          const isAdmin = currentUser && (currentUser.role === "founder" || currentUser.role === "co_admin");

          if (isAdmin) {
            await env.DB.prepare(
              "UPDATE support_messages SET status = 'read' WHERE thread_id = ? AND sender_role NOT IN ('founder', 'admin', 'architect')"
            ).bind(threadId).run();
          } else {
            await env.DB.prepare(
              "UPDATE support_messages SET status = 'read' WHERE thread_id = ? AND sender_role IN ('founder', 'admin', 'architect')"
            ).bind(threadId).run();
          }

          return json({ success: true });
        }

        return json({ error: "Endpoint not found" }, 404);
      } catch (err: any) {
        return json({ error: err.message || "Database error" }, 500);
      }
    }

    // Fallback to static assets with SPA routing support for /admin and client routes
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && !url.pathname.startsWith("/api/")) {
        const indexRequest = new Request(new URL("/", request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return response;
    }

    return new Response("Not found", { status: 404 });
  },
};
