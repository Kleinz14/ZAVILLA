import React from 'react';
import { LogIn, LogOut, Crown } from 'lucide-react';
import { AuthUser } from '../api';

interface AccountBarProps {
  user: AuthUser | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onManagePlan: () => void;
}

export function AccountBar({ user, authLoading, onSignIn, onSignOut, onManagePlan }: AccountBarProps) {
  return (
    <div className="w-full bg-slate-900 text-white text-xs px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {authLoading ? (
          <span className="text-slate-400">Checking session…</span>
        ) : user ? (
          <>
            <span className="truncate text-slate-200">
              Signed in as <span className="font-semibold">{user.name}</span>
            </span>
            {user.role !== 'user' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 font-semibold uppercase tracking-wide text-[10px]">
                <Crown className="w-3 h-3" />
                {user.role}
              </span>
            )}
          </>
        ) : (
          <span className="text-slate-300">Browsing as guest</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!authLoading && !user && (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in / Register
          </button>
        )}

        {!authLoading && user && user.role === 'user' && (
          <button
            onClick={onManagePlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-colors"
          >
            <Crown className="w-3.5 h-3.5" />
            Become an Agent
          </button>
        )}

        {!authLoading && user && (user.role === 'agent' || user.role === 'admin') && (
          <button
            onClick={onManagePlan}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold transition-colors"
          >
            Manage Plan
          </button>
        )}

        {!authLoading && user && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
