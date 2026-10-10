import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = path.join(process.cwd(), 'zavilla.db');

const DEFAULT_PROPERTIES = [
  {
    id: 'prop-1',
    title: 'The Azure Horizon Coastal Villa',
    tagline: 'Panoramic Pacific ocean views with cantilevered infinity pool',
    price: 18500,
    pricePeriod: 'month',
    currency: '$',
    type: 'Villa',
    status: 'Available',
    listingType: 'rent',
    address: '32840 Pacific Coast Highway',
    neighborhood: 'El Matador Bluffs',
    city: 'Malibu',
    state: 'CA',
    zipCode: '90265',
    coordinates: JSON.stringify({ lat: 34.0259, lng: -118.7798, mapX: 24, mapY: 38 }),
    beds: 5,
    baths: 6,
    sqft: 6850,
    lotSizeSqft: 22000,
    garages: 4,
    builtYear: 2023,
    rating: 4.95,
    reviewsCount: 38,
    imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    galleryImages: JSON.stringify([
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ]),
    featured: 1,
    verified: 1,
    amenities: JSON.stringify(['Private Infinity Pool', 'Ocean View', 'Smart Home Automation', 'Wine Cellar', 'Private Elevator', 'Spa & Sauna', 'EV Charger', '24/7 Security']),
    agent: JSON.stringify({
      name: 'Elena Rostova',
      role: 'Principal Estate Broker',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      phone: '+1 (310) 849-2201',
      email: 'elena@zavilla.estate',
      rating: 4.98
    }),
    description: 'An architectural masterpiece overlooking the serene Pacific. Features seamless indoor-outdoor transition with floor-to-ceiling motorized Fleetwood glass pocket doors, bespoke Italian marble kitchen, private wine cellar with tasting room, and solar-powered geothermal climate control.',
    mlsId: 'MLS-ZV-94021',
    addedDate: '2025-05-12',
    viewsCount: 2430,
    savedCount: 312,
    monthlyExpenses: JSON.stringify({
      propertyTax: 2100,
      hoa: 650,
      homeInsurance: 420,
      utilitiesEst: 380
    })
  },
  {
    id: 'prop-2',
    title: 'Solarium Sky Penthouse',
    tagline: 'Triple-height ceilings with 360-degree glass rooftop terrace',
    price: 3850000,
    pricePeriod: 'sale',
    currency: '$',
    type: 'Penthouse',
    status: 'For Sale',
    listingType: 'sale',
    address: '888 Brickell Avenue, PH-48',
    neighborhood: 'Financial District',
    city: 'Miami',
    state: 'FL',
    zipCode: '33131',
    coordinates: JSON.stringify({ lat: 25.7617, lng: -80.1918, mapX: 72, mapY: 65 }),
    beds: 4,
    baths: 4.5,
    sqft: 5200,
    lotSizeSqft: 0,
    garages: 3,
    builtYear: 2024,
    rating: 4.9,
    reviewsCount: 24,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    galleryImages: JSON.stringify([
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'
    ]),
    featured: 1,
    verified: 1,
    amenities: JSON.stringify(['Sky Terrace & Plunge Pool', 'Direct Biscayne Bay View', 'Private Helipad Access', 'Valet & Concierge 24/7', 'Private Elevator', 'Sommelier Room']),
    agent: JSON.stringify({
      name: 'Marcus Sterling',
      role: 'VP Luxury Sales',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
      phone: '+1 (305) 992-4119',
      email: 'marcus@zavilla.estate',
      rating: 4.92
    }),
    description: 'Crowning the Brickell skyline, this one-of-a-kind duplex penthouse offers unmatched grandeur. Features private rooftop pool, custom Poliform cabinetry, Gaggenau kitchen suites, and automated smart blackout louvers.',
    mlsId: 'MLS-ZV-78210',
    addedDate: '2025-06-01',
    viewsCount: 3120,
    savedCount: 420,
    monthlyExpenses: JSON.stringify({
      propertyTax: 3400,
      hoa: 1450,
      homeInsurance: 890,
      utilitiesEst: 510
    })
  }
];

// Adds a column to an existing table only if it isn't already there — lets
// us evolve the schema (e.g. adding ownerId for auth) without wiping out a
// zavilla.db that already has data in it.
function ensureColumn(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initializeDatabase() {
  const exists = fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tagline TEXT,
      price REAL,
      pricePeriod TEXT,
      currency TEXT,
      type TEXT,
      status TEXT,
      listingType TEXT,
      address TEXT,
      neighborhood TEXT,
      city TEXT,
      state TEXT,
      zipCode TEXT,
      coordinates TEXT,
      beds REAL,
      baths REAL,
      sqft REAL,
      lotSizeSqft REAL,
      garages REAL,
      builtYear INTEGER,
      rating REAL,
      reviewsCount INTEGER,
      imageUrl TEXT,
      galleryImages TEXT,
      featured INTEGER,
      verified INTEGER,
      amenities TEXT,
      agent TEXT,
      description TEXT,
      mlsId TEXT,
      addedDate TEXT,
      viewsCount INTEGER,
      savedCount INTEGER,
      monthlyExpenses TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (userId, propertyId)
    );

    -- One row per user: their current agent subscription. Upserted on every
    -- successful payment (initial signup and each recurring renewal).
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL CHECK (plan IN ('essential','professional','signature')),
      flwPlanId TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','cancelled')),
      amount REAL,
      currency TEXT DEFAULT 'USD',
      interval TEXT DEFAULT 'monthly',
      txRef TEXT,
      startedAt TEXT,
      lastPaymentAt TEXT,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Append-only log of every individual charge (initial + each renewal +
    -- failures). flwTransactionId is UNIQUE so webhook retries can't double-
    -- record the same charge.
    CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      flwTransactionId TEXT UNIQUE,
      txRef TEXT,
      plan TEXT,
      amount REAL,
      currency TEXT,
      status TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Property listings now belong to whoever created them, so PUT/DELETE can
  // check ownership. Added as a migration so an existing zavilla.db (with
  // the two seeded properties) keeps its data instead of being recreated.
  ensureColumn(db, 'properties', 'ownerId', 'TEXT');

  if (!exists) {
    const insert = db.prepare(`
      INSERT INTO properties (
        id, title, tagline, price, pricePeriod, currency, type, status, listingType,
        address, neighborhood, city, state, zipCode, coordinates, beds, baths, sqft,
        lotSizeSqft, garages, builtYear, rating, reviewsCount, imageUrl, galleryImages,
        featured, verified, amenities, agent, description, mlsId, addedDate, viewsCount,
        savedCount, monthlyExpenses
      ) VALUES (
        @id, @title, @tagline, @price, @pricePeriod, @currency, @type, @status, @listingType,
        @address, @neighborhood, @city, @state, @zipCode, @coordinates, @beds, @baths, @sqft,
        @lotSizeSqft, @garages, @builtYear, @rating, @reviewsCount, @imageUrl, @galleryImages,
        @featured, @verified, @amenities, @agent, @description, @mlsId, @addedDate, @viewsCount,
        @savedCount, @monthlyExpenses
      )
    `);

    for (const property of DEFAULT_PROPERTIES) {
      insert.run(property);
    }
  }

  return db;
}

function parsePropertyRow(row) {
  return {
    ...row,
    coordinates: JSON.parse(row.coordinates || '{}'),
    galleryImages: JSON.parse(row.galleryImages || '[]'),
    amenities: JSON.parse(row.amenities || '[]'),
    agent: JSON.parse(row.agent || '{}'),
    featured: Boolean(row.featured),
    verified: Boolean(row.verified),
    monthlyExpenses: JSON.parse(row.monthlyExpenses || '{}'),
  };
}

export function getProperties(db) {
  const rows = db.prepare('SELECT * FROM properties ORDER BY addedDate DESC').all();
  return rows.map(parsePropertyRow);
}

export function getPropertyById(db, id) {
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  return row ? parsePropertyRow(row) : null;
}

export function generatePropertyId() {
  return `prop-${crypto.randomBytes(4).toString('hex')}`;
}

export function addProperty(db, property) {
  const stmt = db.prepare(`
    INSERT INTO properties (
      id, ownerId, title, tagline, price, pricePeriod, currency, type, status, listingType,
      address, neighborhood, city, state, zipCode, coordinates, beds, baths, sqft,
      lotSizeSqft, garages, builtYear, rating, reviewsCount, imageUrl, galleryImages,
      featured, verified, amenities, agent, description, mlsId, addedDate, viewsCount,
      savedCount, monthlyExpenses
    ) VALUES (
      @id, @ownerId, @title, @tagline, @price, @pricePeriod, @currency, @type, @status, @listingType,
      @address, @neighborhood, @city, @state, @zipCode, @coordinates, @beds, @baths, @sqft,
      @lotSizeSqft, @garages, @builtYear, @rating, @reviewsCount, @imageUrl, @galleryImages,
      @featured, @verified, @amenities, @agent, @description, @mlsId, @addedDate, @viewsCount,
      @savedCount, @monthlyExpenses
    )
  `);

  const payload = {
    id: property.id,
    ownerId: property.ownerId ?? null,
    title: property.title,
    tagline: property.tagline ?? null,
    price: property.price,
    pricePeriod: property.pricePeriod ?? 'sale',
    currency: property.currency ?? '$',
    type: property.type,
    status: property.status ?? 'Available',
    listingType: property.listingType,
    address: property.address ?? null,
    neighborhood: property.neighborhood ?? null,
    city: property.city ?? null,
    state: property.state || property.stateVal || 'CA',
    zipCode: property.zipCode ?? null,
    coordinates: JSON.stringify(property.coordinates || {}),
    beds: property.beds ?? 0,
    baths: property.baths ?? 0,
    sqft: property.sqft ?? 0,
    lotSizeSqft: property.lotSizeSqft ?? 0,
    garages: property.garages ?? 0,
    builtYear: property.builtYear ?? null,
    rating: property.rating ?? 0,
    reviewsCount: property.reviewsCount ?? 0,
    imageUrl: property.imageUrl ?? null,
    galleryImages: JSON.stringify(property.galleryImages || []),
    featured: property.featured ? 1 : 0,
    verified: property.verified ? 1 : 0,
    amenities: JSON.stringify(property.amenities || []),
    agent: JSON.stringify(property.agent || {}),
    description: property.description ?? null,
    mlsId: property.mlsId ?? null,
    addedDate: property.addedDate ?? new Date().toISOString(),
    viewsCount: property.viewsCount ?? 0,
    savedCount: property.savedCount ?? 0,
    monthlyExpenses: JSON.stringify(property.monthlyExpenses || {}),
  };

  stmt.run(payload);
  return getPropertyById(db, property.id);
}

// Partial update — only columns present in `updates` are changed. `existing`
// is the raw (unparsed) row, used to fall back for any field left out.
export function updateProperty(db, id, updates, existing) {
  const merged = {
    id,
    ownerId: existing.ownerId ?? null,
    title: updates.title ?? existing.title,
    tagline: updates.tagline ?? existing.tagline,
    price: updates.price !== undefined ? Number(updates.price) : existing.price,
    pricePeriod: updates.pricePeriod ?? existing.pricePeriod,
    currency: updates.currency ?? existing.currency,
    type: updates.type ?? existing.type,
    status: updates.status ?? existing.status,
    listingType: updates.listingType ?? existing.listingType,
    address: updates.address ?? existing.address,
    neighborhood: updates.neighborhood ?? existing.neighborhood,
    city: updates.city ?? existing.city,
    state: updates.state ?? existing.state,
    zipCode: updates.zipCode ?? existing.zipCode,
    coordinates: JSON.stringify(updates.coordinates ?? JSON.parse(existing.coordinates || '{}')),
    beds: updates.beds !== undefined ? Number(updates.beds) : existing.beds,
    baths: updates.baths !== undefined ? Number(updates.baths) : existing.baths,
    sqft: updates.sqft !== undefined ? Number(updates.sqft) : existing.sqft,
    lotSizeSqft: updates.lotSizeSqft !== undefined ? Number(updates.lotSizeSqft) : existing.lotSizeSqft,
    garages: updates.garages !== undefined ? Number(updates.garages) : existing.garages,
    builtYear: updates.builtYear !== undefined ? Number(updates.builtYear) : existing.builtYear,
    rating: updates.rating !== undefined ? Number(updates.rating) : existing.rating,
    reviewsCount: updates.reviewsCount !== undefined ? Number(updates.reviewsCount) : existing.reviewsCount,
    imageUrl: updates.imageUrl ?? existing.imageUrl,
    galleryImages: JSON.stringify(updates.galleryImages ?? JSON.parse(existing.galleryImages || '[]')),
    featured: updates.featured !== undefined ? (updates.featured ? 1 : 0) : existing.featured,
    verified: updates.verified !== undefined ? (updates.verified ? 1 : 0) : existing.verified,
    amenities: JSON.stringify(updates.amenities ?? JSON.parse(existing.amenities || '[]')),
    agent: JSON.stringify({ ...JSON.parse(existing.agent || '{}'), ...(updates.agent || {}) }),
    description: updates.description ?? existing.description,
    mlsId: updates.mlsId ?? existing.mlsId,
    addedDate: updates.addedDate ?? existing.addedDate,
    viewsCount: updates.viewsCount !== undefined ? Number(updates.viewsCount) : existing.viewsCount,
    savedCount: updates.savedCount !== undefined ? Number(updates.savedCount) : existing.savedCount,
    monthlyExpenses: JSON.stringify({ ...JSON.parse(existing.monthlyExpenses || '{}'), ...(updates.monthlyExpenses || {}) }),
  };

  db.prepare(`
    UPDATE properties SET
      title=@title, tagline=@tagline, price=@price, pricePeriod=@pricePeriod, currency=@currency,
      type=@type, status=@status, listingType=@listingType, address=@address, neighborhood=@neighborhood,
      city=@city, state=@state, zipCode=@zipCode, coordinates=@coordinates, beds=@beds, baths=@baths,
      sqft=@sqft, lotSizeSqft=@lotSizeSqft, garages=@garages, builtYear=@builtYear, rating=@rating,
      reviewsCount=@reviewsCount, imageUrl=@imageUrl, galleryImages=@galleryImages, featured=@featured,
      verified=@verified, amenities=@amenities, agent=@agent, description=@description, mlsId=@mlsId,
      addedDate=@addedDate, viewsCount=@viewsCount, savedCount=@savedCount, monthlyExpenses=@monthlyExpenses
    WHERE id=@id
  `).run(merged);

  return getPropertyById(db, id);
}

export function deleteProperty(db, id) {
  db.prepare('DELETE FROM properties WHERE id = ?').run(id);
}

// --- Users -----------------------------------------------------------------

export function createUser(db, { name, email, passwordHash, role = 'user' }) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, name, email, passwordHash, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, email, passwordHash, role);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function findUserById(db, id) {
  if (!id) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// --- Favorites ---------------------------------------------------------

export function addFavorite(db, userId, propertyId) {
  db.prepare('INSERT OR IGNORE INTO favorites (userId, propertyId) VALUES (?, ?)').run(userId, propertyId);
}

export function removeFavorite(db, userId, propertyId) {
  db.prepare('DELETE FROM favorites WHERE userId = ? AND propertyId = ?').run(userId, propertyId);
}

export function getFavorites(db, userId) {
  const rows = db.prepare(`
    SELECT p.* FROM properties p
    JOIN favorites f ON f.propertyId = p.id
    WHERE f.userId = ?
    ORDER BY f.createdAt DESC
  `).all(userId);
  return rows.map(parsePropertyRow);
}

// --- Subscriptions (agent plans) ------------------------------------------

// Creates or updates the caller's one subscription row. Used both when a
// payment is first initiated (status: 'pending') and when it's confirmed
// (status: 'active').
export function upsertSubscription(db, { userId, plan, flwPlanId, status, amount, currency, interval, txRef }) {
  const existing = db.prepare('SELECT id FROM subscriptions WHERE userId = ?').get(userId);
  const id = existing?.id ?? crypto.randomUUID();

  db.prepare(`
    INSERT INTO subscriptions (id, userId, plan, flwPlanId, status, amount, currency, interval, txRef, startedAt, updatedAt)
    VALUES (@id, @userId, @plan, @flwPlanId, @status, @amount, @currency, @interval, @txRef, @startedAt, datetime('now'))
    ON CONFLICT(userId) DO UPDATE SET
      plan=excluded.plan, flwPlanId=excluded.flwPlanId, status=excluded.status, amount=excluded.amount,
      currency=excluded.currency, interval=excluded.interval, txRef=excluded.txRef, updatedAt=datetime('now')
  `).run({
    id, userId, plan, flwPlanId: flwPlanId ?? null, status, amount: amount ?? null,
    currency: currency ?? 'USD', interval: interval ?? 'monthly', txRef: txRef ?? null,
    startedAt: existing ? null : new Date().toISOString(),
  });

  return db.prepare('SELECT * FROM subscriptions WHERE userId = ?').get(userId);
}

export function getSubscriptionByUser(db, userId) {
  return db.prepare('SELECT * FROM subscriptions WHERE userId = ?').get(userId) || null;
}

export function getSubscriptionByTxRef(db, txRef) {
  return db.prepare('SELECT * FROM subscriptions WHERE txRef = ?').get(txRef) || null;
}

export function markSubscriptionActive(db, userId) {
  db.prepare(`
    UPDATE subscriptions SET status = 'active', lastPaymentAt = datetime('now'), updatedAt = datetime('now')
    WHERE userId = ?
  `).run(userId);
}

export function markSubscriptionStatus(db, userId, status) {
  db.prepare('UPDATE subscriptions SET status = ?, updatedAt = datetime(\'now\') WHERE userId = ?').run(status, userId);
}

export function setUserRole(db, userId, role) {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
}

// --- Payment events (audit log, idempotency) ------------------------------

// Returns true if this exact Flutterwave transaction was already recorded —
// use this to make webhook handling idempotent (Flutterwave can retry
// webhook delivery, and the callback + webhook can both fire for the same
// charge).
export function hasPaymentEvent(db, flwTransactionId) {
  if (!flwTransactionId) return false;
  return !!db.prepare('SELECT 1 FROM payment_events WHERE flwTransactionId = ?').get(flwTransactionId);
}

export function recordPaymentEvent(db, { userId, flwTransactionId, txRef, plan, amount, currency, status }) {
  db.prepare(`
    INSERT OR IGNORE INTO payment_events (id, userId, flwTransactionId, txRef, plan, amount, currency, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), userId ?? null, flwTransactionId ?? null, txRef ?? null, plan ?? null, amount ?? null, currency ?? null, status ?? null);
}
