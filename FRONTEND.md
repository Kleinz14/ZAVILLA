# ZAVILLA Frontend Integration (Auth + Agent Subscriptions + Seller Page)

This wires the UI up to the auth and payment backend from BACKEND.md.
**No existing component files were touched** — `Sidebar`, `Header`,
`FilterBar`, `PropertyCard`, `PropertyRow`, `PropertyMapSplitView`,
`PropertyDetailModal`, `AddPropertyModal`, `ScheduleTourModal`,
`SavedModal`, `SecondaryViews`, `types.ts`, `data/propertiesData.ts`,
`utils/currency.ts` are all exactly as they already were.

## Files

Drop these into `src/`, alongside the existing files:

```
src/api.ts                              # new — typed fetch client for auth/payments/properties
src/App.tsx                             # replace — the only existing file that changes
src/components/AccountBar.tsx           # new
src/components/AuthModal.tsx            # new
src/components/SellerOnboardingPage.tsx # new — dedicated "become an agent" page
```

`src/components/PricingModal.tsx`, from an earlier round, is now
**superseded** by `SellerOnboardingPage.tsx` and no longer imported by
`App.tsx`. You can delete it, or leave it in place unused — either is fine.

## What changed, and why

The previous version opened a small popup modal for becoming an agent.
This version makes it a real, separate page instead — reached via a
`mainView` state (`'dashboard'` | `'sell'`) in `App.tsx`, not a routing
library, so no new dependencies were needed.

- **`mainView === 'dashboard'`** (the default): the exact customer-facing
  browsing experience that already existed — Sidebar, Header, filters,
  property grid/list/map. Nobody has to sign in or go anywhere near the
  seller flow to browse listings. This is the "customers access listed
  properties separately" part.
- **`mainView === 'sell'`**: renders `SellerOnboardingPage` instead of the
  whole dashboard (a real early-return in `App.tsx`, not an overlay on top
  of it). This page handles all three states in one place:
  1. **Not signed in** → inline register/sign-in form, right on the page
     (not a popup).
  2. **Signed in, not yet an agent** → the three pricing tiers with the
     amount clearly shown, `Pay {currency} {amount} & Subscribe` buttons.
     Clicking one calls `POST /api/payments/subscribe` and redirects to
     Flutterwave's checkout, where the customer picks their own payment
     method (card, mobile money, bank transfer — Flutterwave shows
     whichever apply for the currency, nothing to build for that).
  3. **Already an agent** → a quick summary (how many listings they have)
     and a "Publish a New Property" button straight into the existing
     `AddPropertyModal`.
- **Reaching the seller page**: clicking "Become an Agent"/"Manage Plan" in
  the account bar, or clicking the existing "Add Property" button in
  `Header` while not an agent yet (`handleOpenAddModal` now routes there
  instead of opening a modal).
- **After a successful payment**, the app lands back on `mainView:
  'dashboard'` automatically (the existing `?payment=success` handling now
  also resets the view), and after successfully publishing a property from
  the seller page, it also returns to the dashboard so the new listing is
  visible right away.
- Everything else — filters, sorting, saved properties in `localStorage`,
  view modes, all the other modals — is untouched.

## What I could actually verify, and how

Same process as before: syntax-checked every new/changed file, bundle-
tested `App.tsx` against stub components matching the *exact* prop
signatures it already calls, and type-checked with real `tsc` using your
actual `tsconfig.json` and real `@types/react` — zero errors. This
confirms the code is structurally sound and calls existing components the
same way the original `App.tsx` always did.

## Testing the flow

1. Open the app signed out — you're on the dashboard, browsing normally.
2. Click "Become an Agent" (or try "Add" as a guest) — you land on the
   dedicated seller page, not a popup.
3. Register right there on the page.
4. Pick a plan — the price is shown clearly, click to pay.
5. On success, you're back on the dashboard, and "Add" now opens the
   listing form directly instead of routing you back to the seller page.

