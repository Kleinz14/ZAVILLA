import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeDatabase, getProperties, getPropertyById, addProperty, updateProperty, deleteProperty,
  generatePropertyId, createUser, findUserByEmail, findUserById, addFavorite, removeFavorite, getFavorites,
  upsertSubscription, getSubscriptionByUser, markSubscriptionActive, markSubscriptionStatus,
  setUserRole, hasPaymentEvent, recordPaymentEvent,
} from './db.js';
import {
  hashPassword, comparePassword, signToken, sanitizeUser, attachUser, requireAuth, requireRole, setAuthCookie,
} from './auth.js';
import {
  PLANS, initiateSubscriptionPayment, verifyTransaction, verifyWebhookSignature, resolvePlanFromTransaction,
} from './payments.js';

const app = express();
const PORT = process.env.PORT || 3001;
const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'local';
const ASSET_BASE = DEPLOY_TARGET === 'gh-pages' ? '/zavilla' : '';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const db = initializeDatabase();

const serveApp = (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
};

app.use(express.json());
app.use(cookieParser());
app.use(attachUser((id) => findUserById(db, id)));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'ZAVILLA backend is running',
    timestamp: new Date().toISOString(),
  });
});

// --- Auth --------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 'agent' is no longer self-selectable at signup — it's granted automatically
// once a subscription payment succeeds (see the /api/payments routes below).
const ALLOWED_SELF_SIGNUP_ROLES = ['user'];

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (findUserByEmail(db, normalizedEmail)) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const finalRole = ALLOWED_SELF_SIGNUP_ROLES.includes(role) ? role : 'user';
    const passwordHash = await hashPassword(password);
    const user = createUser(db, { name: name.trim(), email: normalizedEmail, passwordHash, role: finalRole });

    const token = signToken({ sub: user.id });
    setAuthCookie(res, token);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = findUserByEmail(db, email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ sub: user.id });
    setAuthCookie(res, token);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// --- Properties -----------------------------------------------------------

app.get('/api/properties', (_req, res) => {
  res.json({ properties: getProperties(db) });
});

app.get('/api/properties/:id', (req, res) => {
  const property = getPropertyById(db, req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  res.json({ property });
});

app.post('/api/properties', requireAuth, requireRole('agent', 'admin'), (req, res) => {
  const body = req.body || {};

  if (!body.title || body.price === undefined || !body.type || !body.listingType) {
    return res.status(400).json({ error: 'title, price, type and listingType are required' });
  }

  const property = {
    ...body,
    id: body.id || generatePropertyId(),
    ownerId: req.user.id,
  };

  const saved = addProperty(db, property);
  return res.status(201).json({ property: saved });
});

app.put('/api/properties/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Property not found' });
  if (req.user.role !== 'admin' && existing.ownerId && existing.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to modify this property' });
  }

  const updated = updateProperty(db, req.params.id, req.body || {}, existing);
  res.json({ property: updated });
});

app.delete('/api/properties/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Property not found' });
  if (req.user.role !== 'admin' && existing.ownerId && existing.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to delete this property' });
  }

  deleteProperty(db, req.params.id);
  res.status(204).send();
});

// --- Favorites -----------------------------------------------------------

app.get('/api/me/favorites', requireAuth, (req, res) => {
  res.json({ properties: getFavorites(db, req.user.id) });
});

app.post('/api/properties/:id/favorite', requireAuth, (req, res) => {
  const property = getPropertyById(db, req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  addFavorite(db, req.user.id, req.params.id);
  res.json({ favorited: true });
});

app.delete('/api/properties/:id/favorite', requireAuth, (req, res) => {
  removeFavorite(db, req.user.id, req.params.id);
  res.json({ favorited: false });
});

// --- Payments / agent subscriptions ---------------------------------------
//
// Becoming an agent (able to post listings) requires an active paid
// subscription to one of the three plans below, billed recurring by
// Flutterwave. Flow: /subscribe creates a pending subscription + a
// Flutterwave hosted checkout link -> customer pays -> Flutterwave redirects
// back to /callback AND fires a webhook to /webhook. Both paths re-verify
// the transaction server-side before granting agent access; nothing is
// trusted from the redirect query string or webhook body alone.

async function finalizeSuccessfulPayment(verified) {
  if (hasPaymentEvent(db, verified.id)) return; // already processed (webhook retry, or callback + webhook both fired)

  const plan = resolvePlanFromTransaction(verified);
  const email = verified.customer?.email;
  const user = verified.meta?.userId
    ? findUserById(db, verified.meta.userId)
    : (email ? findUserByEmail(db, email) : null);

  if (!user || !plan) {
    console.error('[payments] could not resolve user/plan for transaction', verified.id, { plan, email });
    return;
  }

  recordPaymentEvent(db, {
    userId: user.id, flwTransactionId: verified.id, txRef: verified.tx_ref,
    plan, amount: verified.amount, currency: verified.currency, status: 'successful',
  });

  const planConfig = PLANS[plan];
  upsertSubscription(db, {
    userId: user.id, plan, flwPlanId: planConfig.flwPlanId, status: 'active',
    amount: verified.amount, currency: verified.currency, interval: planConfig.interval, txRef: verified.tx_ref,
  });
  markSubscriptionActive(db, user.id);
  setUserRole(db, user.id, 'agent');
}

app.get('/api/payments/plans', (_req, res) => {
  res.json({
    plans: Object.fromEntries(
      Object.entries(PLANS).map(([key, cfg]) => [key, { ...cfg, configured: Boolean(cfg.flwPlanId) }])
    ),
  });
});

app.get('/api/payments/subscription', requireAuth, (req, res) => {
  res.json({ subscription: getSubscriptionByUser(db, req.user.id) });
});

app.post('/api/payments/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { plan } = req.body || {};
    const planConfig = PLANS[plan];
    if (!planConfig) {
      return res.status(400).json({ error: `plan must be one of: ${Object.keys(PLANS).join(', ')}` });
    }
    if (!planConfig.flwPlanId) {
      return res.status(503).json({
        error: `The ${planConfig.name} plan isn't configured yet — set FLW_PLAN_${plan.toUpperCase()} in .env`,
      });
    }

    const txRef = `zavilla-${plan}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    upsertSubscription(db, {
      userId: req.user.id, plan, flwPlanId: planConfig.flwPlanId, status: 'pending',
      amount: planConfig.amount, currency: planConfig.currency, interval: planConfig.interval, txRef,
    });

    const redirectUrl = `${(process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '')}/api/payments/callback`;
    const link = await initiateSubscriptionPayment({ user: req.user, plan, planConfig, txRef, redirectUrl });

    res.json({ link, txRef });
  } catch (err) {
    next(err);
  }
});

app.get('/api/payments/callback', async (req, res, next) => {
  try {
    const { status, transaction_id } = req.query;
    const appHome = process.env.APP_URL || '/';

    if (status !== 'successful' || !transaction_id) {
      return res.redirect(`${appHome}?payment=failed`);
    }

    const verified = await verifyTransaction(transaction_id);
    if (!verified || verified.status !== 'successful') {
      return res.redirect(`${appHome}?payment=failed`);
    }

    await finalizeSuccessfulPayment(verified);
    return res.redirect(`${appHome}?payment=success`);
  } catch (err) {
    next(err);
  }
});

// Flutterwave sends this for the initial charge AND every automatic
// recurring renewal — respond fast, then verify and process.
app.post('/api/payments/webhook', (req, res) => {
  const signature = req.headers['verif-hash'];
  if (!verifyWebhookSignature(signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  res.status(200).json({ received: true });

  (async () => {
    try {
      const event = req.body;
      if (event?.event === 'charge.completed' && event.data?.id) {
        const verified = await verifyTransaction(event.data.id);
        if (verified?.status === 'successful') {
          await finalizeSuccessfulPayment(verified);
        } else if (verified) {
          const plan = resolvePlanFromTransaction(verified);
          const user = verified.meta?.userId
            ? findUserById(db, verified.meta.userId)
            : findUserByEmail(db, verified.customer?.email);
          if (user) {
            recordPaymentEvent(db, {
              userId: user.id, flwTransactionId: verified.id, txRef: verified.tx_ref,
              plan, amount: verified.amount, currency: verified.currency, status: verified.status,
            });
            markSubscriptionStatus(db, user.id, 'past_due');
          }
        }
      } else if (event?.event === 'subscription.cancelled' && event.data?.email) {
        const user = findUserByEmail(db, event.data.email);
        if (user) {
          markSubscriptionStatus(db, user.id, 'cancelled');
          setUserRole(db, user.id, 'user');
        }
      }
    } catch (err) {
      console.error('[payments] webhook processing failed', err);
    }
  })();
});

// --- Exchange rates (unchanged from the existing implementation) ---------

app.get('/api/exchange-rates', async (_req, res) => {
  const apiKey = process.env.EXCHANGERATE_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'ExchangeRate API is not configured. Set EXCHANGERATE_API_KEY on the server.',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`, {
      signal: controller.signal,
    });
    const data = await response.json();

    if (!response.ok || data.result !== 'success') {
      return res.status(502).json({ error: 'ExchangeRate API request failed.' });
    }

    return res.json({
      base: 'USD',
      rates: {
        '$': 1,
        '€': data.conversion_rates.EUR,
        '£': data.conversion_rates.GBP,
      },
      updatedAt: data.time_last_update_utc,
    });
  } catch {
    return res.status(502).json({ error: 'Unable to reach ExchangeRate API.' });
  } finally {
    clearTimeout(timeout);
  }
});

if (ASSET_BASE) {
  app.use(`${ASSET_BASE}/`, express.static(distDir));
  app.get(`${ASSET_BASE}/`, serveApp);
  app.get(`${ASSET_BASE}/*`, serveApp);
} else {
  app.use(express.static(distDir));
  app.get('*', serveApp);
}

// --- Error handler (must be last) -----------------------------------------

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ZAVILLA backend running on http://localhost:${PORT}${ASSET_BASE || ''}`);
});
