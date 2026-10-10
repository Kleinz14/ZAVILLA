import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { authApi, AuthUser } from '../api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = 'login' | 'register';

export function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { user } =
        mode === 'login' ? await authApi.login(email, password) : await authApi.register(name, email, password);
      onAuthenticated(user);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-sm p-6 sm:p-8 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-900">{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {mode === 'login' ? 'Sign in to save properties and manage your account.' : 'Get started browsing ZAVILLA.'}
        </p>

        <div className="flex items-center gap-1 mt-5 mb-5 bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
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

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
