import crypto from 'node:crypto';

const FLW_BASE = 'https://api.flutterwave.com/v3';

// Pricing for the three agent tiers. Only "Essential = $100" was specified —
// Professional and Signature below are placeholder starting points, edit
// them to whatever you actually want to charge. The `amount` here is sent
// to Flutterwave when initiating payment, but the REAL recurring amount is
// governed by the Payment Plan itself (FLW_PLAN_* in .env) as configured in
// your Flutterwave dashboard — keep these in sync with that configuration.
export const PLANS = {
  essential: {
    name: 'Essential',
    amount: 100,
    currency: 'USD',
    interval: 'monthly',
    flwPlanId: process.env.FLW_PLAN_ESSENTIAL || null,
  },
  professional: {
    name: 'Professional',
    amount: 250,
    currency: 'USD',
    interval: 'monthly',
    flwPlanId: process.env.FLW_PLAN_PROFESSIONAL || null,
  },
  signature: {
    name: 'Signature',
    amount: 500,
    currency: 'USD',
    interval: 'monthly',
    flwPlanId: process.env.FLW_PLAN_SIGNATURE || null,
  },
};

function flwSecretKey() {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error('FLW_SECRET_KEY is not set — payments are not configured on the server.');
  return key;
}

// Creates a Flutterwave Standard hosted-checkout link for a recurring
// subscription payment. The customer pays on Flutterwave's page; on success
// Flutterwave redirects back to `redirectUrl` AND (separately, more
// reliably) fires a webhook to /api/payments/webhook.
export async function initiateSubscriptionPayment({ user, plan, planConfig, txRef, redirectUrl }) {
  if (!planConfig.flwPlanId) {
    throw new Error(`No Flutterwave plan ID configured for "${plan}" — set FLW_PLAN_${plan.toUpperCase()} in .env`);
  }

  const response = await fetch(`${FLW_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${flwSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: planConfig.amount,
      currency: planConfig.currency,
      redirect_url: redirectUrl,
      payment_plan: planConfig.flwPlanId,
      customer: {
        email: user.email,
        name: user.name,
      },
      // Echoed back on transaction verify — the most reliable way to tie a
      // charge back to our own user/plan, since Flutterwave's own recurring
      // renewal charges don't always carry it through, so callers should
      // still fall back to matching on customer email + payment_plan.
      meta: {
        userId: user.id,
        plan,
      },
      customizations: {
        title: 'ZAVILLA Agent Subscription',
        description: `${planConfig.name} plan — ${planConfig.currency} ${planConfig.amount}/${planConfig.interval}`,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok || data.status !== 'success' || !data.data?.link) {
    throw new Error(data.message || 'Failed to create Flutterwave payment link');
  }

  return data.data.link;
}

// Always re-verify server-side before trusting a payment — never act on a
// redirect query param or webhook body alone, both can be spoofed.
export async function verifyTransaction(transactionId) {
  const response = await fetch(`${FLW_BASE}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${flwSecretKey()}` },
  });
  const data = await response.json();
  if (!response.ok || data.status !== 'success') return null;
  return data.data; // { status, amount, currency, tx_ref, customer, meta, payment_plan, ... }
}

// Constant-time comparison against FLW_WEBHOOK_HASH, sent by Flutterwave in
// the `verif-hash` header on every webhook request.
export function verifyWebhookSignature(receivedHash) {
  const expected = process.env.FLW_WEBHOOK_HASH;
  if (!expected || !receivedHash) return false;
  const a = Buffer.from(String(receivedHash));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Given a verified Flutterwave transaction, figures out which of our plans
// it corresponds to — first by the flwPlanId it was charged against
// (works for both the initial charge and auto-recurring renewals), falling
// back to whatever plan our own meta said we initiated with.
export function resolvePlanFromTransaction(verified) {
  const byFlwId = Object.entries(PLANS).find(([, cfg]) => cfg.flwPlanId && cfg.flwPlanId === verified.payment_plan);
  if (byFlwId) return byFlwId[0];
  if (verified.meta?.plan && PLANS[verified.meta.plan]) return verified.meta.plan;
  return null;
}
