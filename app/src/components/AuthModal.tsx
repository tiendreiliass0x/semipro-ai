import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, LogOut, Settings, UserCircle2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

declare global {
  interface Window {
    google?: any;
  }
}

const truncate = (value: string, max = 24) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

export function AuthModal() {
  const {
    isAuthenticated,
    isVerifying,
    error,
    user,
    account,
    memberships,
    login,
    register,
    loginWithGoogle,
    switchWorkspace,
    updateAccountProfile,
    logout,
  } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountSlug, setAccountSlug] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const [settingsName, setSettingsName] = useState('');
  const [settingsSlug, setSettingsSlug] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const canUseGoogle = googleClientId.length > 0;

  useEffect(() => {
    if (!isAuthenticated) setAuthOpen(true);
  }, [isAuthenticated]);

  useEffect(() => {
    if (settingsOpen) {
      setSettingsName(account?.name || '');
      setSettingsSlug(account?.slug || '');
      setSelectedWorkspaceId(account?.id || '');
      setSettingsError(null);
    }
  }, [settingsOpen, account?.id, account?.name, account?.slug]);

  useEffect(() => {
    if (!authOpen || !canUseGoogle || !googleButtonRef.current) return;

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
            accountName: mode === 'register' && accountName.trim() ? accountName.trim() : undefined,
          });
          if (ok) {
            setAuthOpen(false);
          }
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
  }, [authOpen, canUseGoogle, googleClientId, accountName, loginWithGoogle, mode]);

  const actionLabel = useMemo(() => mode === 'login' ? 'Sign In' : 'Create Account', [mode]);

  const submitAuth = async () => {
    setLocalError(null);
    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password are required.');
      return;
    }

    if (mode === 'register') {
      const ok = await register({
        email: email.trim(),
        password,
        accountName: accountName.trim() || undefined,
      });
      if (ok) setAuthOpen(false);
      return;
    }

    const ok = await login({
      email: email.trim(),
      password,
      accountSlug: accountSlug.trim() || undefined,
    });
    if (ok) setAuthOpen(false);
  };

  const saveSettings = async () => {
    setSettingsError(null);
    if (!settingsName.trim()) {
      setSettingsError('Workspace name is required.');
      return;
    }
    const ok = await updateAccountProfile({ name: settingsName.trim(), slug: settingsSlug.trim() || undefined });
    if (ok) setSettingsOpen(false);
  };

  const handleSwitchWorkspace = async () => {
    setSettingsError(null);
    if (!selectedWorkspaceId || selectedWorkspaceId === account?.id) return;
    const ok = await switchWorkspace({ accountId: selectedWorkspaceId });
    if (!ok) {
      setSettingsError('Unable to switch workspace.');
      return;
    }
  };

  const onLogout = async () => {
    await logout();
    setSettingsOpen(false);
    setAuthOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-[#03060d]/90 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-cyan-300/80">Semipro Workflow</p>
            <p className="text-sm font-semibold text-white">SEMIPRO AI</p>
          </div>

          {!isAuthenticated ? (
            <button
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded border border-cyan-400/40 text-cyan-100 bg-black/40"
            >
              <UserCircle2 className="w-4 h-4" /> Sign In
            </button>
          ) : (
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 bg-black/40 max-w-[280px]"
              title="Open account settings"
            >
              <div className="text-right leading-tight min-w-0">
                <p className="text-xs text-gray-100 truncate">{truncate(account?.name || account?.slug || 'Workspace')}</p>
                <p className="text-[10px] text-gray-500 truncate">{truncate(user?.email || user?.name || '')}</p>
              </div>
              <Settings className="w-4 h-4 text-gray-300" />
            </button>
          )}
        </div>
      </header>

      {authOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#060a12] p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{actionLabel}</h3>
                <p className="text-xs text-gray-500">Semipro AI Workspace Access</p>
              </div>
              {isAuthenticated && (
                <button onClick={() => setAuthOpen(false)} className="p-1 rounded border border-gray-700 text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode('login')} className={`flex-1 px-3 py-2 rounded border text-sm ${mode === 'login' ? 'border-cyan-300/70 text-cyan-100 bg-cyan-400/10' : 'border-gray-700 text-gray-300'}`}>Login</button>
              <button onClick={() => setMode('register')} className={`flex-1 px-3 py-2 rounded border text-sm ${mode === 'register' ? 'border-cyan-300/70 text-cyan-100 bg-cyan-400/10' : 'border-gray-700 text-gray-300'}`}>Register</button>
            </div>

            <div className="space-y-2">
              <input value={email} onChange={event => setEmail(event.target.value)} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm" placeholder="Email" type="email" />
              <input value={password} onChange={event => setPassword(event.target.value)} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm" placeholder="Password" type="password" />

              {mode === 'login' ? (
                <input
                  value={accountSlug}
                  onChange={event => setAccountSlug(event.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                  placeholder="Workspace slug (optional)"
                />
              ) : (
                <>
                  <input
                    value={accountName}
                    onChange={event => setAccountName(event.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                    placeholder="Workspace name (optional)"
                  />
                  <p className="text-[11px] text-gray-500">If empty, we auto-generate: &lt;email-local-part&gt; Workspace.</p>
                </>
              )}
            </div>

            {(localError || error) && <p className="text-xs text-rose-300 mt-3">{localError || error}</p>}

            <button onClick={submitAuth} disabled={isVerifying} className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
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

      {settingsOpen && isAuthenticated && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#060a12] p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Account Settings</h3>
                <p className="text-xs text-gray-500">Manage your workspace identity</p>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="p-1 rounded border border-gray-700 text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={settingsName}
                onChange={event => setSettingsName(event.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                placeholder="Workspace name"
              />
              <input
                value={settingsSlug}
                onChange={event => setSettingsSlug(event.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                placeholder="Workspace slug"
              />
              <p className="text-[11px] text-gray-500">Slug is used in account URLs and login targeting.</p>

              {memberships.length > 1 && (
                <div className="pt-2 mt-1 border-t border-gray-800 space-y-2">
                  <p className="text-[11px] uppercase tracking-widest text-gray-500">Switch Workspace</p>
                  <div className="flex gap-2">
                    <select
                      value={selectedWorkspaceId}
                      onChange={event => setSelectedWorkspaceId(event.target.value)}
                      className="flex-1 bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                    >
                      {memberships.map(item => (
                        <option key={item.accountId} value={item.accountId}>
                          {item.accountName} ({item.accountSlug})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleSwitchWorkspace}
                      disabled={isVerifying || selectedWorkspaceId === account?.id}
                      className="px-3 py-2 rounded border border-cyan-400/40 text-cyan-100 text-sm disabled:opacity-50"
                    >
                      Switch
                    </button>
                  </div>
                </div>
              )}
            </div>

            {settingsError && <p className="text-xs text-rose-300 mt-2">{settingsError}</p>}
            {error && !settingsError && <p className="text-xs text-rose-300 mt-2">{error}</p>}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-rose-400/40 text-rose-200 text-sm">
                <LogOut className="w-4 h-4" /> Logout
              </button>
              <button onClick={saveSettings} disabled={isVerifying} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isVerifying ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
