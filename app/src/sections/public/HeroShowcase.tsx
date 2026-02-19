import { useEffect, useState } from 'react';
import { ArrowRight, Clapperboard, PlayCircle } from 'lucide-react';
import heroVideo from '@/assets/kling-page1-v2-5-265.mp4';
import heroPoster from '@/assets/hero-poster.svg';

const openAuth = (mode: 'login' | 'register') => {
  window.dispatchEvent(new CustomEvent('semipro:open-auth', { detail: { mode } }));
};

export function HeroShowcase() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const showVideo = !prefersReducedMotion && !videoFailed;

  return (
    <section className="relative overflow-hidden border-b border-cyan-500/20 min-h-[78vh] md:min-h-[88vh]">
      {showVideo ? (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={heroVideo}
          poster={heroPoster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <img src={heroPoster} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,4,2,0.66)_0%,rgba(5,5,5,0.22)_40%,rgba(1,1,1,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_360px_at_50%_50%,rgba(245,158,11,0.18),transparent_70%)]" />

      <div className="relative max-w-[1200px] mx-auto px-4 py-16 md:py-24 min-h-[78vh] md:min-h-[88vh] flex items-center justify-center text-center">
        <div className="space-y-6 max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-100/90 border border-amber-200/30 bg-black/30 rounded-full px-3 py-1">
            <Clapperboard className="w-3.5 h-3.5" /> AI Filmmaking Studio
          </p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.04] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)]">
            Direct films with AI speed.
          </h1>

          <p className="text-base sm:text-lg text-gray-100/90 max-w-2xl mx-auto">
            From rough idea to polished scenes and final cut in one workspace. Build story beats,
            generate cinematic shots, render videos, and compile your complete film.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => openAuth('register')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#D0FF59] text-black font-semibold text-sm hover:scale-[1.01] transition"
            >
              Start Creating <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => openAuth('login')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/50 text-white text-sm bg-black/25"
            >
              <PlayCircle className="w-4 h-4" /> Sign In
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
