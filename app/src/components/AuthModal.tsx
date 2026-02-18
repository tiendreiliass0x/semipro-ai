import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, LogOut, UserCircle2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthModal() {
  const { isAuthenticated, isVerifying, error, user, account, login, register, loginWithGoogle, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountSlug, setAccountSlug] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const canUseGoogle = googleClientId.length > 0;

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open || !canUseGoogle || !googleButtonRef.current) return;

    const render = () => {
      if (!window.google?.accounts?.id) return;
      const target = googleButtonRef.current;
      if (!target) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential?: string }) => {
          const idToken = String(response?.credential || '');
          if (!idToken) {
            setLocalError('Google sign-in did not return a token.');
            return;
          }
          const ok = await loginWithGoogle({
            idToken,
            accountName: accountName.trim() || undefined,
            accountSlug: accountSlug.trim() || undefined,
          });
          if (ok) setOpen(false);
        },
      });
      target.innerHTML = '';
      window.google.accounts.id.renderButton(target, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });
    };

    if (!window.google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
      return () => {
        script.remove();
      };
    }

    render();
  }, [open, canUseGoogle, googleClientId, accountName, accountSlug, loginWithGoogle]);

  const actionLabel = useMemo(() => {
    if (mode === 'login') return 'Sign In';
    return 'Create Account';
  }, [mode]);

  const submit = async () => {
    setLocalError(null);
    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password are required.');
      return;
    }

    if (mode === 'register') {
      if (!accountName.trim()) {
        setLocalError('Workspace name is required for registration.');
        return;
      }
      const ok = await register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        accountName: accountName.trim(),
        accountSlug: accountSlug.trim() || undefined,
      });
      if (ok) setOpen(false);
      return;
    }

    const ok = await login({
      email: email.trim(),
      password,
      accountSlug: accountSlug.trim() || undefined,
    });
    if (ok) setOpen(false);
  };

  const onLogout = async () => {
    await logout();
    setOpen(true);
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-40">
        {!isAuthenticated ? (
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-cyan-400/40 text-cyan-100 bg-black/40">
            <UserCircle2 className="w-4 h-4" /> Sign In
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 bg-black/40">
            <div className="text-right leading-tight">
              <p className="text-xs text-gray-200">{user?.name || user?.email || 'Signed in'}</p>
              <p className="text-[10px] text-gray-500">{account?.name || account?.slug || ''}</p>
            </div>
            <button onClick={onLogout} className="p-1 rounded border border-gray-700 text-gray-300" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#060a12] p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{actionLabel}</h3>
                <p className="text-xs text-gray-500">Semipro AI Workspace Access</p>
              </div>
              {isAuthenticated && (
                <button onClick={() => setOpen(false)} className="p-1 rounded border border-gray-700 text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 px-3 py-2 rounded border text-sm ${mode === 'login' ? 'border-cyan-300/70 text-cyan-100 bg-cyan-400/10' : 'border-gray-700 text-gray-300'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 px-3 py-2 rounded border text-sm ${mode === 'register' ? 'border-cyan-300/70 text-cyan-100 bg-cyan-400/10' : 'border-gray-700 text-gray-300'}`}
              >
                Register
              </button>
            </div>

            <div className="space-y-2">
              {mode === 'register' && (
                <input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                  placeholder="Full name"
                />
              )}

              <input
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                placeholder="Email"
                type="email"
              />
              <input
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                placeholder="Password"
                type="password"
              />
              <input
                value={accountSlug}
                onChange={event => setAccountSlug(event.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                placeholder={mode === 'login' ? 'Workspace slug (optional)' : 'Workspace slug (optional)'}
              />
              {mode === 'register' && (
                <input
                  value={accountName}
                  onChange={event => setAccountName(event.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                  placeholder="Workspace name"
                />
              )}
            </div>

            {(localError || error) && <p className="text-xs text-rose-300 mt-3">{localError || error}</p>}

            <button
              onClick={submit}
              disabled={isVerifying}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isVerifying ? 'Please wait...' : actionLabel}
            </button>

            {canUseGoogle && (
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Or continue with Google</p>
                <div ref={googleButtonRef} className="min-h-[44px]" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
