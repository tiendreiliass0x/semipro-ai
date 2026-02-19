import { ArrowRight, Clapperboard, PlayCircle } from 'lucide-react';

const openAuth = (mode: 'login' | 'register') => {
  window.dispatchEvent(new CustomEvent('semipro:open-auth', { detail: { mode } }));
};

export function HeroShowcase() {
  return (
    <section className="relative overflow-hidden border-b border-cyan-500/20">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_18%_10%,rgba(16,185,129,0.14),transparent_70%),radial-gradient(900px_400px_at_78%_20%,rgba(34,211,238,0.18),transparent_68%),linear-gradient(180deg,#03070f_0%,#020204_56%,#010101_100%)]" />
      <div className="absolute -left-24 top-20 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />
      <div className="absolute -right-20 top-40 w-80 h-80 rounded-full bg-[#D0FF59]/10 blur-3xl animate-pulse" />

      <div className="relative max-w-[1200px] mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-200/90 border border-cyan-400/30 bg-cyan-400/10 rounded-full px-3 py-1">
            <Clapperboard className="w-3.5 h-3.5" /> AI Filmmaking Studio
          </p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] text-white">
            Direct films with AI speed.
          </h1>

          <p className="text-base sm:text-lg text-gray-300 max-w-xl">
            From rough idea to polished scenes and final cut in one workspace. Build story beats,
            generate cinematic shots, render videos, and compile your complete film.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => openAuth('register')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded bg-[#D0FF59] text-black font-semibold text-sm hover:scale-[1.01] transition"
            >
              Start Creating <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => openAuth('login')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded border border-gray-700 text-gray-200 text-sm"
            >
              <PlayCircle className="w-4 h-4" /> Sign In
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-cyan-500/20 bg-black/40 p-4 shadow-2xl shadow-cyan-900/20 backdrop-blur-sm">
            <div className="aspect-[16/10] rounded-xl border border-gray-800 bg-[linear-gradient(135deg,rgba(6,14,24,0.95),rgba(2,2,2,0.98))] p-4 flex flex-col justify-between">
              <div className="grid grid-cols-3 gap-2">
                {['Idea', 'Beats', 'Scenes'].map(step => (
                  <div key={step} className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100 text-center">
                    {step}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Live Workflow</p>
                <p className="text-sm text-gray-200">Generate scene clips asynchronously and compile final film in one click.</p>
                <div className="w-full h-2 rounded bg-gray-900 overflow-hidden">
                  <div className="h-full w-[72%] bg-gradient-to-r from-cyan-400 to-[#D0FF59]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
