import React, { useEffect, useState } from 'react';
import { X, Check, Loader2, Crown } from 'lucide-react';
import { paymentsApi, Plan, PlanKey, Subscription } from '../api';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLAN_ORDER: PlanKey[] = ['essential', 'professional', 'signature'];

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  essential: ['List properties on ZAVILLA', 'Basic listing analytics', 'Email support'],
  professional: ['Everything in Essential', 'Featured placement in search', 'Priority support'],
  signature: ['Everything in Professional', 'Homepage spotlight', 'Dedicated account manager'],
};

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [plans, setPlans] = useState<Record<PlanKey, Plan> | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [subscribingTo, setSubscribingTo] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingPlans(true);
    setError(null);

    Promise.all([paymentsApi.plans(), paymentsApi.subscription().catch(() => ({ subscription: null }))])
      .then(([plansRes, subRes]) => {
        if (!mounted) return;
        setPlans(plansRes.plans);
        setSubscription(subRes.subscription);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load plans.');
      })
      .finally(() => {
        if (mounted) setLoadingPlans(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async (planKey: PlanKey) => {
    setError(null);
    setSubscribingTo(planKey);
    try {
      const { link } = await paymentsApi.subscribe(planKey);
      window.location.href = link;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setSubscribingTo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-3xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Become a ZAVILLA Agent</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Pick a plan to start listing properties. Billing is monthly and can be managed anytime.
        </p>

        {subscription && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Current plan: <span className="font-bold capitalize">{subscription.plan}</span> —{' '}
            <span className="font-semibold capitalize">{subscription.status.replace('_', ' ')}</span>
          </div>
        )}

        {error && <p className="text-xs text-red-600 font-medium mt-4">{error}</p>}

        {loadingPlans ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {plans &&
              PLAN_ORDER.map((key) => {
                const plan = plans[key];
                if (!plan) return null;
                const isCurrent = subscription?.plan === key && subscription.status === 'active';
                const isMiddle = key === 'professional';

                return (
                  <div
                    key={key}
                    className={`rounded-2xl border p-5 flex flex-col ${
                      isMiddle ? 'border-blue-600 shadow-md relative' : 'border-slate-200'
                    }`}
                  >
                    {isMiddle && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
                        Most Popular
                      </span>
                    )}

                    <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                    <p className="mt-2">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {plan.currency} {plan.amount}
                      </span>
                      <span className="text-xs text-slate-500">/{plan.interval.replace('ly', '')}</span>
                    </p>

                    <ul className="mt-4 space-y-2 flex-1">
                      {PLAN_FEATURES[key].map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSubscribe(key)}
                      disabled={!plan.configured || subscribingTo !== null || isCurrent}
                      className={`mt-5 w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 ${
                        isMiddle
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {subscribingTo === key && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isCurrent
                        ? 'Current Plan'
                        : !plan.configured
                        ? 'Coming Soon'
                        : subscribingTo === key
                        ? 'Redirecting…'
                        : 'Subscribe'}
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
