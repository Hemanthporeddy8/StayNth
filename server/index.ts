/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

async function ensureTables(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      mode TEXT NOT NULL,
      location TEXT NOT NULL,
      price REAL NOT NULL,
      price_unit TEXT DEFAULT 'night',
      bedrooms INTEGER NOT NULL,
      bathrooms INTEGER NOT NULL,
      beds INTEGER DEFAULT 1,
      area REAL NOT NULL,
      description TEXT,
      amenities_json TEXT DEFAULT '[]',
      photos_json TEXT DEFAULT '[]',
      plan_json TEXT NOT NULL,
      owner_name TEXT DEFAULT 'Owner',
      verification TEXT DEFAULT 'unverified',
      latitude REAL,
      longitude REAL,
      inventory_json TEXT DEFAULT '[]',
      floor_plans_json TEXT DEFAULT '[]',
      published INTEGER DEFAULT 1,
      featured INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      reviews_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      property_title TEXT NOT NULL,
      kind TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      email TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      guests INTEGER DEFAULT 1,
      message TEXT,
      total REAL DEFAULT 0,
      inventory_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      author TEXT NOT NULL,
      rating REAL NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function parsePropertyRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    mode: row.mode,
    location: row.location,
    price: row.price,
    priceUnit: row.price_unit,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    beds: row.beds,
    area: row.area,
    description: row.description,
    amenities: JSON.parse(row.amenities_json || "[]"),
    photos: JSON.parse(row.photos_json || "[]"),
    plan: JSON.parse(row.plan_json),
    ownerName: row.owner_name,
    verification: row.verification,
    latitude: row.latitude,
    longitude: row.longitude,
    inventory: JSON.parse(row.inventory_json || "[]"),
    floorPlans: JSON.parse(row.floor_plans_json || "[]"),
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    rating: row.rating,
    reviews: row.reviews_count,
    createdAt: row.created_at,
    mine: false,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
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

        // GET /api/properties
        if (url.pathname === "/api/properties" && request.method === "GET") {
          const showAll = url.searchParams.get("all") === "true";
          const query = showAll
            ? "SELECT * FROM properties ORDER BY created_at DESC"
            : "SELECT * FROM properties WHERE published = 1 ORDER BY featured DESC, created_at DESC";
          const { results } = await env.DB.prepare(query).all();
          const properties = results.map(parsePropertyRow);
          return json(properties);
        }

        // POST /api/properties (Create or Update)
        if (url.pathname === "/api/properties" && request.method === "POST") {
          const body = (await request.json()) as any;
          await env.DB.prepare(
            `INSERT INTO properties (
              id, title, type, mode, location, price, price_unit, bedrooms, bathrooms, beds, area,
              description, amenities_json, photos_json, plan_json, owner_name, verification,
              latitude, longitude, inventory_json, floor_plans_json, published, featured, rating, reviews_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
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
            JSON.stringify(body.plan),
            body.ownerName || "Owner",
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

          return json({ success: true, id: body.id });
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

        return json({ error: "Endpoint not found" }, 404);
      } catch (err: any) {
        return json({ error: err.message || "Database error" }, 500);
      }
    }

    // Fallback to static assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
