import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Crown, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { authApi, paymentsApi, propertiesApi, AuthUser, Plan, PlanKey } from '../api';
import { Property } from '../types';

interface SellerOnboardingPageProps {
  user: AuthUser | null;
  authLoading: boolean;
  onAuthenticated: (user: AuthUser) => void;
  onBack: () => void;
  onOpenAddModal: () => void;
}

type AuthMode = 'login' | 'register';

const PLAN_ORDER: PlanKey[] = ['essential', 'professional', 'signature'];

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  essential: ['List properties on ZAVILLA', 'Basic listing analytics', 'Email support'],
  professional: ['Everything in Essential', 'Featured placement in search', 'Priority support'],
  signature: ['Everything in Professional', 'Homepage spotlight', 'Dedicated account manager'],
};

export function SellerOnboardingPage({
  user,
  authLoading,
  onAuthenticated,
  onBack,
  onOpenAddModal,
}: SellerOnboardingPageProps) {
  // --- Inline auth form (only shown when the visitor isn't signed in yet) ---
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // --- Plans / payment ---
  const [plans, setPlans] = useState<Record<PlanKey, Plan> | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [subscribingTo, setSubscribingTo] = useState<PlanKey | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // --- This user's own listings, shown once they're already an agent ---
  const [myListings, setMyListings] = useState<Property[] | null>(null);

  useEffect(() => {
    paymentsApi
      .plans()
      .then(({ plans }) => setPlans(plans))
      .catch(() => setPaymentError('Could not load pricing. Please refresh and try again.'))
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    if (user && (user.role === 'agent' || user.role === 'admin')) {
      propertiesApi
        .list()
        .then(({ properties }) => setMyListings(properties.filter((p) => (p as any).ownerId === user.id)))
        .catch(() => setMyListings([]));
    }
  }, [user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const { user: authedUser } =
        authMode === 'login' ? await authApi.login(email, password) : await authApi.register(name, email, password);
      onAuthenticated(authedUser);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSubscribe = async (planKey: PlanKey) => {
    setPaymentError(null);
    setSubscribingTo(planKey);
    try {
      const { link } = await paymentsApi.subscribe(planKey);
      window.location.href = link;
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setSubscribingTo(null);
    }
  };

  const isAgent = user && (user.role === 'agent' || user.role === 'admin');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to browsing properties
        </button>

        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4">
            <Crown className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">List Your Property on ZAVILLA</h1>
          <p className="text-sm text-slate-500 mt-2">
            {isAgent
              ? 'Your agent subscription is active — you can publish listings any time.'
              : 'Register, choose a plan, and pay securely to start listing properties for sale or rent.'}
          </p>
        </div>

        {/* Step 1: not signed in yet — register or sign in, inline */}
        {!authLoading && !user && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 max-w-md mx-auto">
            <div className="flex items-center gap-1 mb-5 bg-slate-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  authMode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 8 characters)"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {authError && <p className="text-xs text-red-600 font-medium">{authError}</p>}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                {authSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {authMode === 'login' ? 'Sign In' : 'Create Account & Continue'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: signed in, not an agent yet — show plans + amount + pay */}
        {!authLoading && user && !isAgent && (
          <>
            {paymentError && (
              <p className="text-xs text-red-600 font-medium text-center mb-4">{paymentError}</p>
            )}

            {plansLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {plans &&
                  PLAN_ORDER.map((key) => {
                    const plan = plans[key];
                    if (!plan) return null;
                    const isMiddle = key === 'professional';

                    return (
                      <div
                        key={key}
                        className={`bg-white rounded-3xl border p-6 flex flex-col ${
                          isMiddle ? 'border-blue-600 shadow-md relative' : 'border-slate-200 shadow-xs'
                        }`}
                      >
                        {isMiddle && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
                            Most Popular
                          </span>
                        )}

                        <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                        <p className="mt-2">
                          <span className="text-3xl font-extrabold text-slate-900">
                            {plan.currency} {plan.amount}
                          </span>
                          <span className="text-xs text-slate-500">/{plan.interval.replace('ly', '')}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Billed {plan.interval}, cancel any time.
                        </p>

                        <ul className="mt-5 space-y-2 flex-1">
                          {PLAN_FEATURES[key].map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => handleSubscribe(key)}
                          disabled={!plan.configured || subscribingTo !== null}
                          className={`mt-6 w-full flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 ${
                            isMiddle
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {subscribingTo === key && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {!plan.configured
                            ? 'Coming Soon'
                            : subscribingTo === key
                            ? 'Redirecting to payment…'
                            : `Pay ${plan.currency} ${plan.amount} & Subscribe`}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center mt-6">
              You'll choose how to pay — card, mobile money, or bank transfer — on the next screen.
            </p>
          </>
        )}

        {/* Step 3: already an agent — publish + see your own listings */}
        {!authLoading && isAgent && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">You're a ZAVILLA {user!.role}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {myListings === null
                  ? 'Loading your listings…'
                  : myListings.length === 0
                  ? "You haven't published any properties yet."
                  : `You currently have ${myListings.length} ${myListings.length === 1 ? 'listing' : 'listings'} live.`}
              </p>
              <button
                onClick={onOpenAddModal}
                className="mt-5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Publish a New Property
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
