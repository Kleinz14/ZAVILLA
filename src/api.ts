import { Property } from './types';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }

  return data as T;
}

export type UserRole = 'user' | 'agent' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export const authApi = {
  me: () => apiFetch<{ user: AuthUser }>('/api/auth/me'),
  login: (email: string, password: string) =>
    apiFetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    apiFetch<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
};

export type PlanKey = 'essential' | 'professional' | 'signature';

export interface Plan {
  name: string;
  amount: number;
  currency: string;
  interval: string;
  flwPlanId: string | null;
  configured: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanKey;
  status: 'pending' | 'active' | 'past_due' | 'cancelled';
  amount: number;
  currency: string;
  interval: string;
  lastPaymentAt: string | null;
}

export const paymentsApi = {
  plans: () => apiFetch<{ plans: Record<PlanKey, Plan> }>('/api/payments/plans'),
  subscription: () => apiFetch<{ subscription: Subscription | null }>('/api/payments/subscription'),
  subscribe: (plan: PlanKey) =>
    apiFetch<{ link: string; txRef: string }>('/api/payments/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
};

export const propertiesApi = {
  list: () => apiFetch<{ properties: Property[] }>('/api/properties'),
  create: (property: Partial<Property>) =>
    apiFetch<{ property: Property }>('/api/properties', {
      method: 'POST',
      body: JSON.stringify(property),
    }),
};
