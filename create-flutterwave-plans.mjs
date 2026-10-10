// One-off setup script — creates the three ZAVILLA agent subscription
// plans on your real Flutterwave account, then prints the plan IDs to
// paste into .env as FLW_PLAN_ESSENTIAL / FLW_PLAN_PROFESSIONAL /
// FLW_PLAN_SIGNATURE.
//
// Run this ONCE per environment (test mode first, then again with live
// keys when you're ready to go live — test and live plans are separate).
// Running it twice with the same keys creates duplicate plans, so if you
// need to change pricing later, edit the plan in the Flutterwave dashboard
// instead of re-running this.
//
// Usage:  node create-flutterwave-plans.mjs

import 'dotenv/config';
import Flutterwave from 'flutterwave-node-v3';

// Keep these in sync with the `PLANS` object in payments.js — if you
// change pricing there, update it here too before re-running.
const PLANS_TO_CREATE = [
  { key: 'ESSENTIAL', name: 'ZAVILLA Essential Agent Plan', amount: 100, currency: 'USD', interval: 'monthly' },
  { key: 'PROFESSIONAL', name: 'ZAVILLA Professional Agent Plan', amount: 250, currency: 'USD', interval: 'monthly' },
  { key: 'SIGNATURE', name: 'ZAVILLA Signature Agent Plan', amount: 500, currency: 'USD', interval: 'monthly' },
];

async function main() {
  const { FLW_PUBLIC_KEY, FLW_SECRET_KEY } = process.env;

  if (!FLW_PUBLIC_KEY || !FLW_SECRET_KEY || FLW_SECRET_KEY.includes('YOUR_')) {
    console.error(
      'FLW_PUBLIC_KEY / FLW_SECRET_KEY are missing or still placeholders in your .env.\n' +
      'Get real ones from the Flutterwave dashboard (Settings > API Keys) — use the TEST keys first.'
    );
    process.exit(1);
  }

  const flw = new Flutterwave(FLW_PUBLIC_KEY, FLW_SECRET_KEY);
  const results = [];

  for (const plan of PLANS_TO_CREATE) {
    try {
      const response = await flw.PaymentPlan.create({
        name: plan.name,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
      });

      if (response.status === 'success') {
        console.log(`✓ ${plan.name} created — id: ${response.data.id}`);
        results.push({ envVar: `FLW_PLAN_${plan.key}`, id: response.data.id });
      } else {
        console.error(`✗ Failed to create ${plan.name}:`, response.message || response);
      }
    } catch (err) {
      console.error(`✗ Error creating ${plan.name}:`, err instanceof Error ? err.message : err);
    }
  }

  if (results.length > 0) {
    console.log('\nAdd these to your .env file:\n');
    for (const r of results) {
      console.log(`${r.envVar}="${r.id}"`);
    }
  }
}

main();
