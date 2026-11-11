-- Cloudflare D1 Schema for StayNth

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

CREATE INDEX IF NOT EXISTS idx_properties_published ON properties(published);
CREATE INDEX IF NOT EXISTS idx_requests_property_id ON requests(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);
